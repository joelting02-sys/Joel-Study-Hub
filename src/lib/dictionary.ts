/**
 * 点词翻译核心引擎（纯函数，可用于浏览器、Node 服务端及单元测试）
 *
 * 翻译来源严格遵循优先级：
 * 1. 当前测验 JSON 里的 glossary（专业词组，整组匹配、最长匹配优先）
 * 2. 大写缩写特殊处理（IS = 信息系统，IT = 信息技术等；区分大小写，确保 lowercase "is" 仍走动词释义）
 * 3. 离线词典 ECDICT（含 exchange 字段词形还原：plans -> plan, went -> go）
 * 4. 都找不到时返回 found: false 与「暂无释义」
 */

import type { EcdictRecord, LookupResult } from '../types/studyhub.ts';
import { BUILTIN_ECDICT_RECORDS } from './ecdictSeed.ts';
import { cleanToken } from './textTokenize.ts';

export interface AcronymEntry {
  word: string;
  meaning_zh: string;
  pos: string;
}

/** 大写专业缩写表（严格区分大小写，只有全大写才命中） */
export const UPPERCASE_ACRONYMS: Record<string, AcronymEntry> = {
  IS: { word: 'IS', pos: 'abbr.', meaning_zh: '信息系统 (Information System)' },
  IT: { word: 'IT', pos: 'abbr.', meaning_zh: '信息技术 (Information Technology)' },
  ICT: { word: 'ICT', pos: 'abbr.', meaning_zh: '信息与通信技术 (Information & Communications Technology)' },
  MIS: { word: 'MIS', pos: 'abbr.', meaning_zh: '管理信息系统 (Management Information System)' },
  ERP: { word: 'ERP', pos: 'abbr.', meaning_zh: '企业资源计划 (Enterprise Resource Planning)' },
  CRM: { word: 'CRM', pos: 'abbr.', meaning_zh: '客户关系管理 (Customer Relationship Management)' },
  SCM: { word: 'SCM', pos: 'abbr.', meaning_zh: '供应链管理 (Supply Chain Management)' },
  TPS: { word: 'TPS', pos: 'abbr.', meaning_zh: '事务处理系统 (Transaction Processing System)' },
  DSS: { word: 'DSS', pos: 'abbr.', meaning_zh: '决策支持系统 (Decision Support System)' },
  ESS: { word: 'ESS', pos: 'abbr.', meaning_zh: '高管支持系统 (Executive Support System)' },
  BI: { word: 'BI', pos: 'abbr.', meaning_zh: '商业智能 (Business Intelligence)' },
  AI: { word: 'AI', pos: 'abbr.', meaning_zh: '人工智能 (Artificial Intelligence)' },
  API: { word: 'API', pos: 'abbr.', meaning_zh: '应用程序接口 (Application Programming Interface)' },
  SQL: { word: 'SQL', pos: 'abbr.', meaning_zh: '结构化查询语言 (Structured Query Language)' },
  SLA: { word: 'SLA', pos: 'abbr.', meaning_zh: '服务级别协议 (Service Level Agreement)' },
  KPI: { word: 'KPI', pos: 'abbr.', meaning_zh: '关键绩效指标 (Key Performance Indicator)' },
  ROI: { word: 'ROI', pos: 'abbr.', meaning_zh: '投资回报率 (Return on Investment)' },
  B2B: { word: 'B2B', pos: 'abbr.', meaning_zh: '企业对企业 (Business-to-Business)' },
  B2C: { word: 'B2C', pos: 'abbr.', meaning_zh: '企业对消费者 (Business-to-Consumer)' },
  GDP: { word: 'GDP', pos: 'abbr.', meaning_zh: '国内生产总值 (Gross Domestic Product)' },
  CPI: { word: 'CPI', pos: 'abbr.', meaning_zh: '消费者物价指数 (Consumer Price Index)' },
  PED: { word: 'PED', pos: 'abbr.', meaning_zh: '需求价格弹性 (Price Elasticity of Demand)' },
  SWOT: { word: 'SWOT', pos: 'abbr.', meaning_zh: '优势/劣势/机会/威胁分析' },
  SaaS: { word: 'SaaS', pos: 'abbr.', meaning_zh: '软件即服务 (Software as a Service)' },
  PaaS: { word: 'PaaS', pos: 'abbr.', meaning_zh: '平台即服务 (Platform as a Service)' },
  IaaS: { word: 'IaaS', pos: 'abbr.', meaning_zh: '基础设施即服务 (Infrastructure as a Service)' },
};

export interface DictionaryIndex {
  byWord: Map<string, EcdictRecord>;
  /** 词形变化表：inflectedLower -> lemmaLower（来自 ECDICT exchange 字段） */
  inflectionToLemma: Map<string, string>;
}

/**
 * 将 ECDICT 多行中文释义拆分为去重后的独立义项列表
 */
export function splitMeaningSenses(rawTranslation: string): string[] {
  if (!rawTranslation) return [];
  const cleaned = rawTranslation
    .replace(/\\n/g, '\n')
    .split(/\n/)
    .map((line) => line.replace(/^[a-z]+\.\s*/i, '').trim())
    .filter(Boolean)
    .join('；');

  const parts = cleaned
    .split(/[；;，,]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const unique: string[] = [];
  for (const p of parts) {
    if (!unique.includes(p)) {
      unique.push(p);
    }
  }
  return unique;
}

/**
 * 将 ECDICT 多行中文释义精简为最多 maxSenses 个简短义项
 */
export function condenseMeaningZh(rawTranslation: string, maxSenses = 3): string {
  return splitMeaningSenses(rawTranslation).slice(0, maxSenses).join('；');
}

/**
 * 从 ECDICT exchange 字段解析变形词映射
 * 格式示例: "p:went/d:gone/i:going/3:goes" 或 "0:plan/1:s"
 */
export function buildDictionaryIndex(records: EcdictRecord[]): DictionaryIndex {
  const byWord = new Map<string, EcdictRecord>();
  const inflectionToLemma = new Map<string, string>();

  for (const rec of records) {
    const lower = rec.word.trim().toLowerCase();
    if (!lower) continue;
    if (!byWord.has(lower)) {
      byWord.set(lower, rec);
    }
    if (rec.exchange) {
      const pairs = rec.exchange.split('/');
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx === -1) continue;
        const tag = pair.slice(0, colonIdx).trim();
        const val = pair.slice(colonIdx + 1).trim().toLowerCase();
        if (!val) continue;
        if (tag === '0') {
          // 0:lemma 表示当前词是 val 的变形
          if (!inflectionToLemma.has(lower)) {
            inflectionToLemma.set(lower, val);
          }
        } else if (['p', 'd', 'i', '3', 's', 'r', 't'].includes(tag)) {
          // p/d/i/3/s/r/t 表示 val 是当前词的变形
          if (!inflectionToLemma.has(val)) {
            inflectionToLemma.set(val, lower);
          }
        }
      }
    }
  }

  return { byWord, inflectionToLemma };
}

/** 轻量级英文规则词尾兜底还原（当外置词典缺少 exchange 字段时作为补充） */
function ruleBasedLemmaCandidates(lower: string): string[] {
  const candidates: string[] = [];
  if (lower.endsWith('ies') && lower.length > 4) {
    candidates.push(lower.slice(0, -3) + 'y');
  }
  if (lower.endsWith('es') && lower.length > 3) {
    candidates.push(lower.slice(0, -2));
    candidates.push(lower.slice(0, -1));
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
    candidates.push(lower.slice(0, -1));
  }
  if (lower.endsWith('ied') && lower.length > 4) {
    candidates.push(lower.slice(0, -3) + 'y');
  }
  if (lower.endsWith('ed') && lower.length > 3) {
    candidates.push(lower.slice(0, -2));
    candidates.push(lower.slice(0, -1));
    // 双写辅音 planned -> plan
    const stem = lower.slice(0, -2);
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.push(stem.slice(0, -1));
    }
  }
  if (lower.endsWith('ing') && lower.length > 4) {
    const stem = lower.slice(0, -3);
    candidates.push(stem);
    candidates.push(stem + 'e');
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.push(stem.slice(0, -1));
    }
  }
  return candidates;
}

const DEFAULT_INDEX = buildDictionaryIndex(BUILTIN_ECDICT_RECORDS);

export function getDefaultDictionaryIndex(): DictionaryIndex {
  return DEFAULT_INDEX;
}

export interface LookupOptions {
  glossary?: Record<string, string>;
  /** 如果前端已经通过最长匹配识别到 glossary 键，直接传入 */
  matchedGlossaryKey?: string;
  /** 可选自定义词典索引（如服务端加载了完整 ecdict.csv） */
  dictIndex?: DictionaryIndex;
}

function findEcdictRecord(
  cleanedSurface: string,
  dictIndex: DictionaryIndex,
): { rec: EcdictRecord; lemmaNote?: string } | null {
  const lower = cleanedSurface.toLowerCase();
  if (!lower) return null;

  const mappedLemma = dictIndex.inflectionToLemma.get(lower);
  if (mappedLemma && mappedLemma !== lower) {
    const lemmaRec = dictIndex.byWord.get(mappedLemma);
    if (lemmaRec) {
      return { rec: lemmaRec, lemmaNote: `${cleanedSurface} → ${lemmaRec.word}` };
    }
  }

  const directRec = dictIndex.byWord.get(lower);
  if (directRec) {
    return { rec: directRec };
  }

  for (const cand of ruleBasedLemmaCandidates(lower)) {
    const candRec = dictIndex.byWord.get(cand);
    if (candRec) {
      return { rec: candRec, lemmaNote: `${cleanedSurface} → ${candRec.word}` };
    }
  }

  return null;
}

function buildGlossaryLookupResult(
  matchedKey: string,
  rawSurface: string,
  cleanedSurface: string,
  glossaryMeaning: string,
  dictIndex: DictionaryIndex,
): LookupResult {
  const lookupToken = cleanedSurface || matchedKey.trim();
  const ecdictHit = !lookupToken.includes(' ') ? findEcdictRecord(lookupToken, dictIndex) : null;
  const primaryParts = new Set(
    splitMeaningSenses(glossaryMeaning).map((s) => s.trim()).filter(Boolean),
  );
  const alternatives = ecdictHit
    ? splitMeaningSenses(ecdictHit.rec.translation)
        .filter((s) => s !== glossaryMeaning.trim() && !primaryParts.has(s))
        .slice(0, 5)
    : [];

  return {
    word: matchedKey,
    surface: rawSurface.trim(),
    phonetic: ecdictHit?.rec.phonetic || '',
    pos: '术语',
    meaning_zh: glossaryMeaning,
    ...(alternatives.length > 0 ? { alternatives } : {}),
    source: 'glossary',
    found: true,
  };
}

function buildEcdictLookupResult(
  rec: EcdictRecord,
  cleanedSurface: string,
  lemmaNote?: string,
): LookupResult {
  const allSenses = splitMeaningSenses(rec.translation);
  const meaningZh = allSenses.slice(0, 3).join('；');
  const alternatives = allSenses.slice(3, 7);
  return {
    word: rec.word,
    surface: cleanedSurface,
    phonetic: rec.phonetic,
    pos: rec.pos,
    meaning_zh: meaningZh,
    ...(alternatives.length > 0 ? { alternatives } : {}),
    source: 'ecdict',
    ...(lemmaNote ? { lemmaNote } : {}),
    found: true,
  };
}

/**
 * Optimal String Alignment (Damerau-Levenshtein) distance for typo detection/suggestions.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = val;
    }
  }
  return dp[m][n];
}

/**
 * Suggest closest valid words from offline dictionary when an input token is not found.
 */
export function suggestSpelling(
  rawSurface: string,
  dictIndex: DictionaryIndex = DEFAULT_INDEX,
  limit = 3,
): string[] {
  const trimmed = (rawSurface || '').trim();
  if (!trimmed || trimmed.includes(' ')) return [];
  const lower = cleanToken(trimmed).toLowerCase();
  if (lower.length < 3 || lower.length > 32 || !/^[a-z][a-z-]*$/.test(lower)) {
    return [];
  }
  if (dictIndex.byWord.has(lower) || dictIndex.inflectionToLemma.has(lower)) {
    return [];
  }

  const maxDist = lower.length <= 5 ? 1 : 2;
  const scored: Array<{ word: string; dist: number; firstMismatch: number; lenDiff: number }> = [];

  for (const cand of dictIndex.byWord.keys()) {
    if (cand.includes(' ')) continue;
    const lenDiff = Math.abs(cand.length - lower.length);
    if (lenDiff > maxDist) continue;
    const dist = damerauLevenshtein(lower, cand);
    if (dist > 0 && dist <= maxDist) {
      scored.push({
        word: dictIndex.byWord.get(cand)?.word || cand,
        dist,
        firstMismatch: cand[0] === lower[0] ? 0 : 1,
        lenDiff,
      });
    }
  }

  scored.sort(
    (a, b) =>
      a.dist - b.dist ||
      a.firstMismatch - b.firstMismatch ||
      a.lenDiff - b.lenDiff ||
      a.word.localeCompare(b.word),
  );

  return scored.slice(0, limit).map((s) => s.word);
}

/**
 * 执行点词翻译（严格遵守 4 级优先级）
 */
export function lookupWord(rawSurface: string, options: LookupOptions = {}): LookupResult {
  const { glossary, matchedGlossaryKey, dictIndex = DEFAULT_INDEX } = options;
  const cleanedSurface = cleanToken(rawSurface);

  // 1. 优先匹配当前测验 glossary（整组匹配优先，并从离线词典补充音标与其他说法）
  if (glossary) {
    if (matchedGlossaryKey && glossary[matchedGlossaryKey] !== undefined) {
      return buildGlossaryLookupResult(
        matchedGlossaryKey,
        rawSurface,
        cleanedSurface,
        glossary[matchedGlossaryKey],
        dictIndex,
      );
    }
    const targetLower = cleanedSurface.toLowerCase();
    // 尝试直接匹配单/多词 glossary 键（按长度降序）
    const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (key.trim().toLowerCase() === targetLower || key.trim().toLowerCase() === rawSurface.trim().toLowerCase()) {
        return buildGlossaryLookupResult(
          key,
          rawSurface,
          cleanedSurface,
          glossary[key],
          dictIndex,
        );
      }
    }
  }

  // 2. 大写缩写特殊处理（如 IS -> 信息系统, IT -> 信息技术；区分大小写，防止把小写 is 误判）
  if (cleanedSurface && UPPERCASE_ACRONYMS[cleanedSurface]) {
    const abbr = UPPERCASE_ACRONYMS[cleanedSurface];
    return {
      word: abbr.word,
      surface: cleanedSurface,
      phonetic: '',
      pos: abbr.pos,
      meaning_zh: abbr.meaning_zh,
      source: 'acronym',
      found: true,
    };
  }

  // 3. 离线词典 ECDICT + exchange 词形还原
  if (cleanedSurface) {
    const hit = findEcdictRecord(cleanedSurface, dictIndex);
    if (hit) {
      return buildEcdictLookupResult(hit.rec, cleanedSurface, hit.lemmaNote);
    }
  }

  // 4. 找不到时返回「暂无释义」并给出拼写相似建议
  const fallbackWord = cleanedSurface || rawSurface.trim();
  const suggestions = suggestSpelling(fallbackWord, dictIndex, 3);
  return {
    word: fallbackWord,
    surface: fallbackWord,
    phonetic: '',
    pos: '',
    meaning_zh: '',
    source: 'not_found',
    ...(suggestions.length > 0 ? { suggestions } : {}),
    found: false,
  };
}
