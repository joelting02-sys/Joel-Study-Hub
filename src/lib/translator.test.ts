import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  fetchAvailableModels,
  getTranslationApiStatus,
  parseModelsListPayload,
  parseModelTranslationPayload,
  saveTranslationConfig,
  translateWordWithApi,
  validateTranslationEndpoint,
} from '../../server/translator.ts';

function makeTempConfigPath(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `studyhub-${label}-`));
  return path.join(dir, 'studyhub-config.json');
}

test('validateTranslationEndpoint permits public HTTPS and local loopback gateways while blocking LAN/metadata hosts', () => {
  assert.equal(validateTranslationEndpoint('https://ark.cn-beijing.volces.com/api/v3').ok, true);
  assert.equal(validateTranslationEndpoint('https://api.deepseek.com/v1').ok, true);
  assert.equal(validateTranslationEndpoint('http://127.0.0.1:3425/v1').ok, true);
  assert.equal(validateTranslationEndpoint('http://localhost:11434/v1').ok, true);
  assert.equal(validateTranslationEndpoint('http://[::1]:3425/v1').ok, true);

  assert.equal(validateTranslationEndpoint('http://169.254.169.254/latest/meta-data').ok, false);
  assert.equal(validateTranslationEndpoint('http://10.0.0.1/v1').ok, false);
  assert.equal(validateTranslationEndpoint('http://192.168.1.5/v1').ok, false);
  assert.equal(validateTranslationEndpoint('http://metadata.google.internal/v1').ok, false);
  assert.equal(validateTranslationEndpoint('file:///etc/passwd').ok, false);
});

test('saveTranslationConfig persists config safely and never leaks raw API keys', () => {
  const cfgPath = makeTempConfigPath('save');
  try {
    const emptyStatus = getTranslationApiStatus({}, cfgPath);
    assert.equal(emptyStatus.configured, false);
    assert.equal(emptyStatus.hasApiKey, false);

    const placeholderEnvStatus = getTranslationApiStatus(
      {
        TRANSLATE_API_BASE_URL: 'magpie',
        TRANSLATE_API_KEY: 'placeholder',
        TRANSLATE_API_MODEL: 'placeholder',
      },
      cfgPath,
    );
    assert.equal(placeholderEnvStatus.configured, false);
    assert.equal(placeholderEnvStatus.baseUrl, '');
    assert.equal(placeholderEnvStatus.hasApiKey, false);
    assert.equal(placeholderEnvStatus.error, undefined);

    const saved = saveTranslationConfig(
      {
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/',
        apiKey: 'ark-secret-1234567890',
        model: 'doubao-seed-translation-250915',
      },
      cfgPath,
    );
    assert.equal(saved.configured, true);
    assert.equal(saved.baseUrl, 'https://ark.cn-beijing.volces.com/api/v3');
    assert.equal(saved.endpointHost, 'ark.cn-beijing.volces.com');
    assert.equal(saved.model, 'doubao-seed-translation-250915');
    assert.equal(saved.hasApiKey, true);
    assert.equal(saved.apiKeyPreview, 'ark-****7890');
    assert.equal('apiKey' in saved, false);

    // Updating model without resending apiKey preserves existing key
    const updated = saveTranslationConfig(
      {
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-20250101-demo',
      },
      cfgPath,
    );
    assert.equal(updated.model, 'ep-20250101-demo');
    assert.equal(updated.hasApiKey, true);
    assert.equal(updated.apiKeyPreview, 'ark-****7890');

    // Clearing key removes it cleanly
    const cleared = saveTranslationConfig(
      {
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-20250101-demo',
        clearApiKey: true,
      },
      cfgPath,
    );
    assert.equal(cleared.hasApiKey, false);
    assert.equal(cleared.apiKeyPreview, '');
  } finally {
    fs.rmSync(path.dirname(cfgPath), { recursive: true, force: true });
  }
});

test('parseModelsListPayload and fetchAvailableModels detect models and gracefully fallback for Volcengine Ark', async () => {
  assert.deepEqual(
    parseModelsListPayload({
      data: [
        { id: 'doubao-1-5-pro-32k' },
        { id: 'doubao-seed-translation-250915' },
        { id: 'doubao-1-5-pro-32k' },
      ],
    }),
    ['doubao-1-5-pro-32k', 'doubao-seed-translation-250915'],
  );

  const cfgPath = makeTempConfigPath('models');
  try {
    let fetchedUrl = '';
    let fetchedAuth = '';
    const fakeOpenAiFetch: typeof fetch = async (url, init) => {
      fetchedUrl = String(url);
      fetchedAuth = (init?.headers as Record<string, string>)?.Authorization || '';
      return new Response(
        JSON.stringify({
          data: [{ id: 'model-b' }, { id: 'model-a' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const detected = await fetchAvailableModels(
      { baseUrl: 'https://api.example.com/v1/chat/completions', apiKey: 'key-xyz' },
      {},
      cfgPath,
      fakeOpenAiFetch,
    );
    assert.equal(fetchedUrl, 'https://api.example.com/v1/models');
    assert.equal(fetchedAuth, 'Bearer key-xyz');
    assert.deepEqual(detected.models, ['model-a', 'model-b']);
    assert.equal(detected.count, 2);

    // Volcengine Ark /models non-200 fallback returns doubao-seed-translation-250915 with a helpful note
    const fakeArk404Fetch: typeof fetch = async () => new Response('Not Found', { status: 404 });
    const arkFallback = await fetchAvailableModels(
      { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', apiKey: 'ark-key' },
      {},
      cfgPath,
      fakeArk404Fetch,
    );
    assert.deepEqual(arkFallback.models, ['doubao-seed-translation-250915']);
    assert.equal(arkFallback.count, 1);
    assert.ok(arkFallback.note && arkFallback.note.includes('doubao') === false ? arkFallback.note.includes('豆包') : true);
  } finally {
    fs.rmSync(path.dirname(cfgPath), { recursive: true, force: true });
  }
});

test('parseModelTranslationPayload parses OpenAI choices, Doubao responses output, and code-fenced JSON', () => {
  const openaiRes = parseModelTranslationPayload(
    {
      choices: [
        {
          message: {
            content:
              '```json\n{"word":"amortize","phonetic":"/ˈæmərtaɪz/","pos":"v.","meaning_zh":"摊销；分期偿还"}\n```',
          },
        },
      ],
    },
    'amortized',
  );
  assert.equal(openaiRes.word, 'amortize');
  assert.equal(openaiRes.phonetic, 'ˈæmərtaɪz');
  assert.equal(openaiRes.pos, 'v.');
  assert.equal(openaiRes.meaning_zh, '摊销；分期偿还');
  assert.equal(openaiRes.source, 'api');
  assert.equal(openaiRes.lemmaNote, 'amortized → amortize');

  const doubaoRes = parseModelTranslationPayload(
    {
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: '摊销' }],
        },
      ],
    },
    'amortization',
  );
  assert.equal(doubaoRes.word, 'amortization');
  assert.equal(doubaoRes.meaning_zh, '摊销');
  assert.equal(doubaoRes.source, 'api');
});

test('translateWordWithApi routes doubao-seed-translation to /responses and general models to /chat/completions', async () => {
  const cfgPath = makeTempConfigPath('translate');
  try {
    // 1. Doubao Seed Translation -> /responses with translation_options
    let capturedUrl = '';
    let capturedAuth = '';
    let capturedBody: Record<string, unknown> = {};

    const fakeDoubaoFetch: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization || '';
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          output: [
            {
              role: 'assistant',
              content: [{ type: 'output_text', text: '可扩展性' }],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const doubaoResult = await translateWordWithApi(
      { surface: 'scalability' },
      {
        TRANSLATE_API_BASE_URL: 'https://ark.cn-beijing.volces.com/api/v3',
        TRANSLATE_API_KEY: 'ark-dummy-key',
        TRANSLATE_API_MODEL: 'doubao-seed-translation-250915',
      },
      fakeDoubaoFetch,
      cfgPath,
    );

    assert.equal(capturedUrl, 'https://ark.cn-beijing.volces.com/api/v3/responses');
    assert.equal(capturedAuth, 'Bearer ark-dummy-key');
    assert.equal(capturedBody.model, 'doubao-seed-translation-250915');
    assert.equal(doubaoResult.meaning_zh, '可扩展性');
    assert.equal(doubaoResult.source, 'api');

    // 2. General Ark/OpenAI model -> /chat/completions
    const fakeChatFetch: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization || '';
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"word":"scalability","phonetic":"ˌskeɪləˈbɪləti","pos":"n.","meaning_zh":"可扩展性"}',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const chatResult = await translateWordWithApi(
      {
        surface: 'scalability',
        sentence: 'Cloud platforms improve scalability.',
        subject: 'ICT',
      },
      {
        TRANSLATE_API_BASE_URL: 'https://ark.cn-beijing.volces.com/api/v3',
        TRANSLATE_API_KEY: 'ark-dummy-key',
        TRANSLATE_API_MODEL: 'ep-20250501-demo',
      },
      fakeChatFetch,
      cfgPath,
    );

    assert.equal(capturedUrl, 'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
    assert.equal(capturedAuth, 'Bearer ark-dummy-key');
    assert.equal(capturedBody.model, 'ep-20250501-demo');
    assert.equal(chatResult.meaning_zh, '可扩展性');
    assert.equal(chatResult.phonetic, 'ˌskeɪləˈbɪləti');

    // 3. Magpie local gateway + doubao-translate/doubao-ai -> /responses and pure-word /chat/completions fallback
    const magpieSaved = saveTranslationConfig(
      {
        baseUrl: 'http://127.0.0.1:3425/v1',
        apiKey: 'sk-magpie-key-demo',
        model: 'doubao-translate/doubao-ai',
      },
      cfgPath,
    );
    assert.equal(magpieSaved.configured, true);
    assert.equal(magpieSaved.endpointHost, '127.0.0.1:3425');

    const magpieResponsesResult = await translateWordWithApi(
      { surface: 'amortization', sentence: 'Annual amortization applies.' },
      {},
      fakeDoubaoFetch,
      cfgPath,
    );
    assert.equal(capturedUrl, 'http://127.0.0.1:3425/v1/responses');
    assert.equal(capturedBody.model, 'doubao-translate/doubao-ai');
    assert.equal(magpieResponsesResult.meaning_zh, '可扩展性');

    const fakeMagpieChatFallbackFetch: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body || '{}'));
      if (capturedUrl.endsWith('/responses')) {
        return new Response('Not Implemented', { status: 404 });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '摊销' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const magpieFallbackResult = await translateWordWithApi(
      { surface: 'amortization', sentence: 'Annual amortization applies.' },
      {},
      fakeMagpieChatFallbackFetch,
      cfgPath,
    );
    assert.equal(capturedUrl, 'http://127.0.0.1:3425/v1/chat/completions');
    assert.deepEqual(capturedBody.messages, [{ role: 'user', content: 'amortization' }]);
    assert.equal(magpieFallbackResult.meaning_zh, '摊销');
  } finally {
    fs.rmSync(path.dirname(cfgPath), { recursive: true, force: true });
  }
});

test('parseModelTranslationPayload extracts context_zh, correctedFrom, plain_zh, alternatives, and synonyms cleanly', () => {
  const rich = parseModelTranslationPayload(
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              word: 'stakeholder',
              corrected_from: 'stakholder',
              phonetic: 'ˈsteɪkhəʊldə(r)',
              pos: 'n.',
              example_en: 'Every stakeholder has a voice in the decision.',
              context_zh: '企业利益相关方',
              meaning_zh: '利益相关者；干系人',
              plain_zh: '跟公司或项目有利害关系的人（比如股东、员工、客户）',
              alternatives: ['股东', '利益方', '利益相关者；干系人', '企业利益相关方'],
              synonyms: ['shareholder', 'interested party', 'stakeholder'],
            }),
          },
        },
      ],
    },
    'stakholder',
  );
  assert.equal(rich.word, 'stakeholder');
  assert.equal(rich.correctedFrom, 'stakholder');
  assert.equal(rich.example_en, 'Every stakeholder has a voice in the decision.');
  assert.equal(rich.context_zh, '企业利益相关方');
  assert.equal(rich.plain_zh, '跟公司或项目有利害关系的人（比如股东、员工、客户）');
  assert.deepEqual(rich.alternatives, ['股东', '利益方']);
  assert.deepEqual(rich.synonyms, ['shareholder', 'interested party']);

  const noSelfCorrection = parseModelTranslationPayload(
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              word: 'margin',
              corrected_from: 'Margin',
              meaning_zh: '利润率',
            }),
          },
        },
      ],
    },
    'margin',
  );
  assert.equal(noSelfCorrection.correctedFrom, undefined);
});

test('pickFastReasoningEffort disables reasoning for DeepSeek Flash and retries on 400 fallback', async () => {
  const { pickFastReasoningEffort } = await import('../../server/translator.ts');
  assert.equal(pickFastReasoningEffort('auto/deepseek-v4.1-flash'), 'none');
  assert.equal(pickFastReasoningEffort('workbuddy-ai/deepseek-v4.1-flash-sg'), 'none');
  assert.equal(pickFastReasoningEffort('auto/minimax-m3.1-flash'), 'low');
  assert.equal(pickFastReasoningEffort('auto/hy4flash-free'), undefined);
  assert.equal(pickFastReasoningEffort('doubao-translate/doubao-ai'), undefined);

  const cfgPath = makeTempConfigPath('reasoning-fallback');
  try {
    const attempts: Array<Record<string, unknown>> = [];
    const fallbackFetch: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      attempts.push(body);
      if (attempts.length === 1) {
        return new Response('Unknown parameter: reasoning_effort', { status: 400 });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"word":"stakeholder","meaning_zh":"利益相关者；股东"}' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const res = await translateWordWithApi(
      { surface: 'stakeholder', subject: 'Business' },
      {
        TRANSLATE_API_BASE_URL: 'http://127.0.0.1:3425/v1',
        TRANSLATE_API_KEY: 'sk-test',
        TRANSLATE_API_MODEL: 'auto/deepseek-v4.1-flash',
      },
      fallbackFetch,
      cfgPath,
    );
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].reasoning_effort, 'none');
    assert.equal(attempts[0].max_tokens, 320);
    assert.equal('reasoning_effort' in attempts[1], false);
    assert.equal(res.meaning_zh, '利益相关者；股东');
  } finally {
    fs.rmSync(path.dirname(cfgPath), { recursive: true, force: true });
  }
});
