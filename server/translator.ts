/**
 * 外部翻译模型 API 服务端代理模块
 * - 支持用户仅配置 Base URL + API Key + Model（兼容豆包火山方舟 Ark、豆包翻译 doubao-seed-translation 及所有 OpenAI 兼容接口）
 * - 支持自动侦测可用模型列表（GET <baseUrl>/models）
 * - 配置持久化保存在服务端本地配置文件（不暴露原始 API Key 给前端），也兼容环境变量回退
 * - 严格校验目标地址，禁止私网、回环及云元数据地址，防止 SSRF
 */

import fs from 'fs';
import net from 'net';
import path from 'path';
import type {
  FetchModelsInput,
  FetchModelsResult,
  LookupResult,
  SaveTranslationConfigInput,
  TranslateWordInput,
  TranslationApiStatus,
} from '../src/types/studyhub.ts';
import { cleanToken } from '../src/lib/textTokenize.ts';

interface StoredTranslationConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

interface ResolvedTranslatorConfig {
  baseUrl: string;
  endpointHost: string;
  apiKey: string;
  model: string;
}

const REQUEST_TIMEOUT_MS = 15_000;
const CONFIG_FILE_PATH = path.resolve(process.cwd(), 'studyhub-config.json');

function isPrivateOrRestrictedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  // 允许 127.0.0.0/8 本地回环地址（用于 Magpie / Ollama 等本机大模型网关）
  if (a === 0 || a === 10) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateOrRestrictedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::') return true;
  if (normalized === '::1') return false;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    if (net.isIP(mapped) === 4) {
      return isPrivateOrRestrictedIpv4(mapped);
    }
  }
  return false;
}

/**
 * 校验翻译 API Base URL：允许公网 http/https 及本机回环网关（如 Magpie 127.0.0.1 / localhost），拒绝私网与云元数据地址
 */
export function validateTranslationEndpoint(
  rawUrl: string,
): { ok: true; url: URL } | { ok: false; error: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: '请填写 Base URL（例如 https://ark.cn-beijing.volces.com/api/v3 或 http://127.0.0.1:3425/v1）',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Base URL 格式无效，请以 https:// 或 http:// 开头' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Base URL 仅支持 https:// 或 http:// 协议' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Base URL 不允许内嵌凭据' };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname) {
    return { ok: false, error: 'Base URL 缺少有效主机名' };
  }

  const blockedHostnames = new Set([
    'metadata.google.internal',
    'metadata',
    'instance-data',
  ]);
  if (
    blockedHostnames.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { ok: false, error: '出于安全限制，接口地址不允许指向局域网广播主机或云元数据服务' };
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4 && isPrivateOrRestrictedIpv4(hostname)) {
    return { ok: false, error: '出于安全限制，接口地址不允许指向内网私网或云元数据 IPv4 地址' };
  }
  if (ipVersion === 6 && isPrivateOrRestrictedIpv6(hostname)) {
    return { ok: false, error: '出于安全限制，接口地址不允许指向内网私网或云元数据 IPv6 地址' };
  }

  return { ok: true, url: parsed };
}

function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

function normalizeBaseUrlString(url: URL): string {
  const cleanPath = url.pathname
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/responses$/i, '')
    .replace(/\/models$/i, '');
  const cloned = new URL(url.toString());
  cloned.pathname = cleanPath || '';
  cloned.search = '';
  cloned.hash = '';
  return cloned.toString().replace(/\/+$/, '');
}

function buildApiPathUrl(baseUrl: string, suffix: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${suffix.replace(/^\/+/, '')}`;
}

function readStoredConfig(configPath: string = CONFIG_FILE_PATH): StoredTranslationConfig {
  try {
    if (!fs.existsSync(configPath)) return {};
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (parsed && typeof parsed.translation === 'object' && parsed.translation !== null) {
      return {
        baseUrl: typeof parsed.translation.baseUrl === 'string' ? parsed.translation.baseUrl.trim() : '',
        apiKey: typeof parsed.translation.apiKey === 'string' ? parsed.translation.apiKey.trim() : '',
        model: typeof parsed.translation.model === 'string' ? parsed.translation.model.trim() : '',
      };
    }
  } catch {
    // 忽略损坏的配置文件
  }
  return {};
}

export function saveTranslationConfig(
  input: SaveTranslationConfigInput,
  configPath: string = CONFIG_FILE_PATH,
): TranslationApiStatus {
  const rawBaseUrl = (input.baseUrl || '').trim();
  const model = (input.model || '').trim();
  const existing = readStoredConfig(configPath);

  let normalizedBaseUrl = '';
  if (rawBaseUrl) {
    const validation = validateTranslationEndpoint(rawBaseUrl);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    normalizedBaseUrl = normalizeBaseUrlString(validation.url);
  }

  let nextApiKey = existing.apiKey || '';
  if (input.clearApiKey) {
    nextApiKey = '';
  } else if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
    nextApiKey = input.apiKey.trim();
  }

  let rootConfig: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        rootConfig = parsed as Record<string, unknown>;
      }
    }
  } catch {
    rootConfig = {};
  }

  rootConfig.translation = {
    baseUrl: normalizedBaseUrl,
    apiKey: nextApiKey,
    model,
  };

  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${configPath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(rootConfig, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, configPath);

  return getTranslationApiStatus(process.env, configPath);
}

function readEffectiveConfig(
  env: NodeJS.ProcessEnv = process.env,
  configPath: string = CONFIG_FILE_PATH,
): {
  config?: ResolvedTranslatorConfig;
  status: TranslationApiStatus;
} {
  const stored = readStoredConfig(configPath);
  const envBaseUrl = (env.TRANSLATE_API_BASE_URL || '').trim();
  const hasUsableEnvBaseUrl = /^https?:\/\//i.test(envBaseUrl);

  const rawBaseUrl = (stored.baseUrl || (hasUsableEnvBaseUrl ? envBaseUrl : '')).trim();
  const apiKey = (
    stored.apiKey || (hasUsableEnvBaseUrl ? env.TRANSLATE_API_KEY || '' : '')
  ).trim();
  const model = (
    stored.model || (hasUsableEnvBaseUrl ? env.TRANSLATE_API_MODEL || '' : '')
  ).trim();

  if (!rawBaseUrl) {
    return {
      status: {
        configured: false,
        baseUrl: '',
        model,
        endpointHost: '',
        hasApiKey: Boolean(apiKey),
        apiKeyPreview: maskApiKey(apiKey),
      },
    };
  }

  const validation = validateTranslationEndpoint(rawBaseUrl);
  if (!validation.ok) {
    return {
      status: {
        configured: false,
        baseUrl: rawBaseUrl,
        model,
        endpointHost: '',
        hasApiKey: Boolean(apiKey),
        apiKeyPreview: maskApiKey(apiKey),
        error: validation.error,
      },
    };
  }

  const normalizedBaseUrl = normalizeBaseUrlString(validation.url);

  return {
    config: {
      baseUrl: normalizedBaseUrl,
      endpointHost: validation.url.host,
      apiKey,
      model,
    },
    status: {
      configured: Boolean(normalizedBaseUrl && model),
      baseUrl: normalizedBaseUrl,
      model,
      endpointHost: validation.url.host,
      hasApiKey: Boolean(apiKey),
      apiKeyPreview: maskApiKey(apiKey),
    },
  };
}

export function getTranslationApiStatus(
  env: NodeJS.ProcessEnv = process.env,
  configPath: string = CONFIG_FILE_PATH,
): TranslationApiStatus {
  return readEffectiveConfig(env, configPath).status;
}

/**
 * 从 GET <baseUrl>/models 响应体中提取所有模型 ID
 */
export function parseModelsListPayload(payload: unknown): string[] {
  const ids = new Set<string>();

  const collectFromArray = (arr: unknown[]) => {
    for (const item of arr) {
      if (typeof item === 'string' && item.trim()) {
        ids.add(item.trim());
      } else if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const id =
          (typeof rec.id === 'string' && rec.id.trim()) ||
          (typeof rec.name === 'string' && rec.name.trim()) ||
          (typeof rec.model === 'string' && rec.model.trim()) ||
          '';
        if (id) ids.add(id);
      }
    }
  };

  if (Array.isArray(payload)) {
    collectFromArray(payload);
  } else if (payload && typeof payload === 'object') {
    const rec = payload as Record<string, unknown>;
    if (Array.isArray(rec.data)) collectFromArray(rec.data);
    if (Array.isArray(rec.models)) collectFromArray(rec.models);
  }

  return Array.from(ids).sort((a, b) => a.localeCompare(b));
}

/**
 * 自动侦测指定 API（Base URL + API Key）下有哪些可用模型
 */
export async function fetchAvailableModels(
  input: FetchModelsInput = {},
  env: NodeJS.ProcessEnv = process.env,
  configPath: string = CONFIG_FILE_PATH,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchModelsResult> {
  const { config } = readEffectiveConfig(env, configPath);
  const rawBaseUrl = (input.baseUrl || config?.baseUrl || '').trim();
  const apiKey = (input.apiKey || config?.apiKey || '').trim();

  const validation = validateTranslationEndpoint(rawBaseUrl);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const normalizedBaseUrl = normalizeBaseUrlString(validation.url);
  const modelsUrl = buildApiPathUrl(normalizedBaseUrl, 'models');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(modelsUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        detail = (await response.text()).slice(0, 180);
      } catch {
        // ignore
      }
      // 火山方舟 Ark 等部分平台可能未开放 /models 列表接口，提示用户可直接填写豆包模型 ID 或接入点 ep-...
      if (validation.url.host.includes('volces.com')) {
        return {
          models: ['doubao-seed-translation-250915'],
          count: 1,
          note: `火山方舟 /models 返回 HTTP ${response.status}，已提供豆包翻译默认模型 ID，也可直接输入你在控制台创建的模型/接入点 ID（如 ep-xxxx）。`,
        };
      }
      throw new Error(`侦测模型列表失败（HTTP ${response.status}）${detail ? `: ${detail}` : ''}`);
    }

    const payload = await response.json();
    const models = parseModelsListPayload(payload);
    if (models.length === 0) {
      return {
        models: validation.url.host.includes('volces.com')
          ? ['doubao-seed-translation-250915']
          : [],
        count: validation.url.host.includes('volces.com') ? 1 : 0,
        note: '该接口未返回模型列表，可直接手动输入模型 ID。',
      };
    }

    return { models, count: models.length };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('侦测模型列表超时（15 秒），请检查 Base URL 或网络状态');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function extractFirstJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = stripMarkdownFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  return '';
}

function pickStringList(
  obj: Record<string, unknown>,
  keys: string[],
  excludeValues: string[] = [],
  limit = 6,
): string[] {
  const excluded = new Set(excludeValues.map((v) => v.trim().toLowerCase()).filter(Boolean));
  const out: string[] = [];
  const pushItem = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (excluded.has(lower)) return;
    if (!out.some((x) => x.toLowerCase() === lower) && out.length < limit) {
      out.push(trimmed);
    }
  };

  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string') pushItem(item);
      }
      if (out.length > 0) return out;
    } else if (typeof val === 'string' && val.trim()) {
      for (const part of val.split(/[；;，,]/)) {
        pushItem(part);
      }
      if (out.length > 0) return out;
    }
  }
  return out;
}

function extractTextFromResponsesApi(record: Record<string, unknown>): string {
  if (typeof record.output_text === 'string' && record.output_text.trim()) {
    return record.output_text.trim();
  }
  if (Array.isArray(record.output)) {
    const parts: string[] = [];
    for (const item of record.output) {
      if (!item || typeof item !== 'object') continue;
      const itemRec = item as Record<string, unknown>;
      if (typeof itemRec.text === 'string' && itemRec.text.trim()) {
        parts.push(itemRec.text.trim());
      }
      if (Array.isArray(itemRec.content)) {
        for (const block of itemRec.content) {
          if (!block || typeof block !== 'object') continue;
          const blockRec = block as Record<string, unknown>;
          if (typeof blockRec.text === 'string' && blockRec.text.trim()) {
            parts.push(blockRec.text.trim());
          }
        }
      }
    }
    if (parts.length > 0) {
      return parts.join(' ').trim();
    }
  }
  return '';
}

/**
 * 解析翻译模型返回内容（兼容 OpenAI /chat/completions、豆包翻译 /responses 与纯文本）
 */
export function parseModelTranslationPayload(
  rawPayload: unknown,
  fallbackSurface: string,
): LookupResult {
  const cleanedSurface = cleanToken(fallbackSurface) || fallbackSurface.trim();
  let obj: Record<string, unknown> | null = null;
  let plainTextFallback = '';

  if (typeof rawPayload === 'string') {
    obj = extractFirstJsonObject(rawPayload);
    plainTextFallback = stripMarkdownFences(rawPayload);
  } else if (rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
    const record = rawPayload as Record<string, unknown>;
    if (Array.isArray(record.choices) && record.choices.length > 0) {
      const first = record.choices[0] as Record<string, unknown>;
      const msg = first?.message as Record<string, unknown> | undefined;
      const content =
        typeof msg?.content === 'string'
          ? msg.content
          : typeof first?.text === 'string'
            ? first.text
            : '';
      if (content) {
        obj = extractFirstJsonObject(content);
        plainTextFallback = stripMarkdownFences(content);
      }
    } else if (record.output || record.output_text) {
      const respText = extractTextFromResponsesApi(record);
      if (respText) {
        obj = extractFirstJsonObject(respText);
        plainTextFallback = stripMarkdownFences(respText);
      }
    } else if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
      obj = record.data as Record<string, unknown>;
    } else {
      obj = record;
    }
  }

  let word = cleanedSurface;
  let phonetic = '';
  let pos = '';
  let contextZh = '';
  let meaningZh = '';
  let plainZh = '';
  let alternatives: string[] = [];
  let synonyms: string[] = [];

  if (obj) {
    word = pickString(obj, ['word', 'lemma', 'base_form']) || cleanedSurface;
    phonetic = pickString(obj, ['phonetic', 'ipa']).replace(/^\/+|\/+$/g, '');
    pos = pickString(obj, ['pos', 'part_of_speech', 'partOfSpeech']);
    contextZh = pickString(obj, [
      'context_zh',
      'contextZh',
      'contextual_meaning',
      'context_meaning',
    ]);
    meaningZh = pickString(obj, [
      'meaning_zh',
      'translation',
      'translated_text',
      'translatedText',
      'meaning',
      'result',
      'text',
    ]);
    plainZh = pickString(obj, [
      'plain_zh',
      'plainZh',
      'simple_zh',
      'colloquial_zh',
      'explanation_zh',
      'explanation',
    ]);
    alternatives = pickStringList(
      obj,
      ['alternatives', 'chinese_synonyms', 'other_meanings', 'cn_synonyms', 'translations'],
      [meaningZh, contextZh],
    );
    synonyms = pickStringList(
      obj,
      ['synonyms', 'english_synonyms', 'similar_words', 'related_words'],
      [word, cleanedSurface],
    );
  }

  if (!meaningZh && plainTextFallback) {
    meaningZh = plainTextFallback.replace(/\s+/g, ' ').slice(0, 200).trim();
  }

  if (!meaningZh) {
    throw new Error('翻译接口返回内容为空，无法解析中文释义');
  }

  const lemmaNote =
    word.toLowerCase() !== cleanedSurface.toLowerCase()
      ? `${cleanedSurface} → ${word}`
      : undefined;

  return {
    word,
    surface: cleanedSurface,
    phonetic,
    pos,
    meaning_zh: meaningZh,
    ...(contextZh ? { context_zh: contextZh } : {}),
    ...(plainZh ? { plain_zh: plainZh } : {}),
    ...(alternatives.length > 0 ? { alternatives } : {}),
    ...(synonyms.length > 0 ? { synonyms } : {}),
    source: 'api',
    lemmaNote,
    found: true,
  };
}

function isDedicatedTranslationModel(model: string): boolean {
  const lower = model.trim().toLowerCase();
  return (
    lower.includes('doubao-seed-translation') ||
    lower.includes('seed-translation') ||
    lower.includes('doubao-translate') ||
    lower.includes('volcengine-translate') ||
    lower.includes('microsoft-translator') ||
    lower.endsWith('-translate') ||
    lower.endsWith('-translator') ||
    lower.endsWith('/translate')
  );
}

export function pickFastReasoningEffort(model: string): 'none' | 'low' | undefined {
  const lower = model.trim().toLowerCase();
  if (!lower || isDedicatedTranslationModel(lower) || lower.includes('hy4flash')) {
    return undefined;
  }
  if (lower.includes('deepseek') && !lower.includes('-max')) {
    return 'none';
  }
  if (lower.includes('gpt-5')) {
    return 'none';
  }
  if (
    lower.includes('minimax') ||
    lower.includes('gemini') ||
    lower.includes('deepseek-v4.1-flash-max') ||
    lower.includes('claude') ||
    lower.includes('gpt-6') ||
    lower.startsWith('o1') ||
    lower.startsWith('o3') ||
    lower.startsWith('o4')
  ) {
    return 'low';
  }
  return undefined;
}

async function postJsonWithTimeout(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<{ status: number; ok: boolean; payload: unknown; rawText: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const rawText = await response.text();
    let payload: unknown = rawText;
    try {
      payload = JSON.parse(rawText);
    } catch {
      // 保留纯文本
    }
    return { status: response.status, ok: response.ok, payload, rawText };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('翻译接口请求超时（15 秒），请检查 Base URL 或网络状态');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 调用已配置的翻译模型（自动适配豆包专用翻译 /responses 与标准 /chat/completions）
 */
export async function translateWordWithApi(
  input: TranslateWordInput,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
  configPath: string = CONFIG_FILE_PATH,
): Promise<LookupResult> {
  const surface = (input.surface || '').trim().slice(0, 240);
  if (!surface) {
    throw new Error('缺少待翻译的英文单词或短语');
  }

  const sentence = (input.sentence || '').trim().slice(0, 1000);
  const subject = (input.subject || '').trim().slice(0, 80);

  const { config, status } = readEffectiveConfig(env, configPath);
  if (!config || !config.model) {
    throw new Error(
      status.error ||
        '尚未完成翻译模型配置，请在「设置 → 翻译模型」填写 Base URL、API Key 并选择模型',
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const cleanedWord = cleanToken(surface) || surface;

  const dedicatedTranslator = isDedicatedTranslationModel(config.model);

  // 1. 专用翻译模型（doubao-seed-translation-* / Magpie doubao-translate/* 等）优先走 /responses + translation_options，若代理不支持则自动回退 /chat/completions
  if (dedicatedTranslator) {
    const responsesUrl = buildApiPathUrl(config.baseUrl, 'responses');
    const responsesBody = {
      model: config.model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: cleanedWord,
              translation_options: {
                source_language: 'en',
                target_language: 'zh',
              },
            },
          ],
        },
      ],
    };

    try {
      const resp = await postJsonWithTimeout(responsesUrl, headers, responsesBody, fetchImpl);
      if (resp.ok) {
        return parseModelTranslationPayload(resp.payload, surface);
      }
      // 只有 404/405/501 等端点不兼容时才回退 /chat/completions，鉴权错误直接返回
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`翻译接口鉴权失败（HTTP ${resp.status}），请检查 API Key 是否正确`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('鉴权失败')) {
        throw err;
      }
    }
  }

  // 2. 标准 OpenAI 兼容 /chat/completions（专用翻译通道回退时仅发纯单词，通用大模型则附带精简词典提示并关闭不必要的推理思考）
  const chatUrl = buildApiPathUrl(config.baseUrl, 'chat/completions');
  const reasoningEffort = dedicatedTranslator ? undefined : pickFastReasoningEffort(config.model);
  const shortSentence = sentence.slice(0, 240);

  const buildChatPayload = (withReasoningControl: boolean): Record<string, unknown> => {
    if (dedicatedTranslator) {
      return {
        model: config.model,
        messages: [{ role: 'user', content: cleanedWord }],
      };
    }
    const userPrompt = [
      shortSentence ? `${cleanedWord} | 句: ${shortSentence}` : cleanedWord,
      subject ? `课: ${subject}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    const payload: Record<string, unknown> = {
      model: config.model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            '英汉学习词典。只返回合法JSON：{"word":"词原形或短语","phonetic":"音标(无斜杠)","pos":"词性","context_zh":"在当前原句中最贴切的一句话中文意思(无原句可留空)","meaning_zh":"2-4个核心中文义项，；分隔","plain_zh":"一句大白话通俗解释","alternatives":["2-3个直观中文说法"],"synonyms":["2-3个英文同义词"]}',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };
    if (withReasoningControl && reasoningEffort) {
      payload.reasoning_effort = reasoningEffort;
      if (reasoningEffort === 'none') {
        payload.max_tokens = 280;
      } else if (reasoningEffort === 'low') {
        payload.max_tokens = 340;
      }
    }
    return payload;
  };

  let chatResp = await postJsonWithTimeout(chatUrl, headers, buildChatPayload(true), fetchImpl);
  if (!chatResp.ok && reasoningEffort && (chatResp.status === 400 || chatResp.status === 422)) {
    chatResp = await postJsonWithTimeout(chatUrl, headers, buildChatPayload(false), fetchImpl);
  }
  if (!chatResp.ok) {
    const snippet = chatResp.rawText.slice(0, 240);
    throw new Error(`翻译接口返回 HTTP ${chatResp.status}${snippet ? `: ${snippet}` : ''}`);
  }

  return parseModelTranslationPayload(chatResp.payload, surface);
}
