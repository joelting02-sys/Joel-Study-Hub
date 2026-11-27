import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBasicStopWord,
  mergeVocabIntoLocalLookup,
  PersistentTranslationCache,
  shouldSkipAutoApiLookup,
  type StorageLike,
} from './translationCache';
import { formatPhoneticDisplay, inferTypoCorrection, mergeLookupEnrichment } from './lookupHelpers';
import type { LookupResult, VocabEntry } from '../types/studyhub';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
  };
}

test('isBasicStopWord and shouldSkipAutoApiLookup fast-path function words', () => {
  assert.equal(isBasicStopWord('the'), true);
  assert.equal(isBasicStopWord('With,'), true);
  assert.equal(isBasicStopWord('amortization'), false);
  assert.equal(isBasicStopWord('supply chain'), false);

  const ecdictThe: LookupResult = {
    word: 'the',
    surface: 'the',
    phonetic: 'ðə',
    pos: 'art.',
    meaning_zh: '这；那',
    source: 'ecdict',
    found: true,
  };
  const ecdictAmortize: LookupResult = {
    word: 'amortize',
    surface: 'amortizing',
    phonetic: 'ˈæmərtaɪz',
    pos: 'v.',
    meaning_zh: '摊销',
    source: 'ecdict',
    found: true,
  };
  const notFoundRes: LookupResult = {
    word: 'xyz',
    surface: 'xyz',
    phonetic: '',
    pos: '',
    meaning_zh: '',
    source: 'not_found',
    found: false,
  };

  assert.equal(shouldSkipAutoApiLookup('the', ecdictThe, 'always_api'), true);
  assert.equal(shouldSkipAutoApiLookup('amortizing', ecdictAmortize, 'always_api'), false);
  assert.equal(shouldSkipAutoApiLookup('amortizing', ecdictAmortize, 'auto_fallback'), true);
  assert.equal(shouldSkipAutoApiLookup('xyz', notFoundRes, 'auto_fallback'), false);
  assert.equal(shouldSkipAutoApiLookup('xyz', notFoundRes, 'manual'), true);
});

test('mergeVocabIntoLocalLookup enriches missing phonetics and prioritizes vocab meaning', () => {
  const vocabEntry: VocabEntry = {
    id: '1',
    word: 'protest',
    meaning_zh: '抗议活动；公开反对',
    phonetic: 'n. /ˈprəʊtest/ · v. /prəˈtest/',
    pos: 'n. / v.',
    context: 'Street protests stopped businesses.',
    source: 'Lesson 10',
    subject: 'ES',
    status: 'learning',
    added_at: '2026-11-26T00:00:00Z',
    learned_at: null,
    lookup_count: 2,
    review: { next_review: '2026-11-27', interval_days: 1 },
  };

  const ecdictNoPhonetic: LookupResult = {
    word: 'protest',
    surface: 'protests',
    phonetic: '',
    pos: 'n.',
    meaning_zh: '抗议；断言',
    alternatives: ['反对'],
    source: 'ecdict',
    found: true,
  };

  const merged = mergeVocabIntoLocalLookup(ecdictNoPhonetic, vocabEntry);
  assert.equal(merged.phonetic, 'n. /ˈprəʊtest/ · v. /prəˈtest/');
  assert.equal(merged.meaning_zh, '抗议活动；公开反对');
  assert.ok(merged.alternatives?.includes('抗议'));
  assert.ok(merged.alternatives?.includes('反对'));

  const glossaryHit: LookupResult = {
    word: 'protest',
    surface: 'protest',
    phonetic: '',
    pos: '术语',
    meaning_zh: '示威抗议',
    source: 'glossary',
    found: true,
  };
  const mergedGlossary = mergeVocabIntoLocalLookup(glossaryHit, vocabEntry);
  assert.equal(mergedGlossary.meaning_zh, '示威抗议');
  assert.equal(mergedGlossary.phonetic, 'n. /ˈprəʊtest/ · v. /prəˈtest/');
});

test('formatPhoneticDisplay prevents double slashes', () => {
  assert.equal(formatPhoneticDisplay('ˈsteɪkhəʊldə(r)'), '/ˈsteɪkhəʊldə(r)/');
  assert.equal(formatPhoneticDisplay('/ˌeɪviˈeɪʃn/'), '/ˌeɪviˈeɪʃn/');
  assert.equal(formatPhoneticDisplay('n. /ˈprəʊtest/ · v. /prəˈtest/'), 'n. /ˈprəʊtest/ · v. /prəˈtest/');
  assert.equal(formatPhoneticDisplay(''), '');
});

test('PersistentTranslationCache persists across instances, isolates models, and strips stale context_zh on word fallback', () => {
  const storage = createMemoryStorage();
  const cache1 = new PersistentTranslationCache(storage, 'test_cache', 10);

  const sample: LookupResult = {
    word: 'margin',
    surface: 'margin',
    phonetic: 'ˈmɑːdʒɪn',
    pos: 'n.',
    context_zh: '利润率',
    meaning_zh: '利润率；边缘；保证金',
    source: 'api',
    found: true,
  };

  cache1.set('model-a', 'margin', 'Profit margin improved this quarter.', sample);

  // Simulate app restart
  const cache2 = new PersistentTranslationCache(storage, 'test_cache', 10);
  const exact = cache2.getExact('model-a', 'margin', 'Profit margin improved this quarter.');
  assert.equal(exact?.context_zh, '利润率');

  const fallback = cache2.getWordFallback('model-a', 'margin');
  assert.equal(fallback?.meaning_zh, '利润率；边缘；保证金');
  assert.equal(fallback?.context_zh, undefined);

  assert.equal(cache2.getExact('model-b', 'margin', 'Profit margin improved this quarter.'), undefined);

  cache2.deleteExact('model-a', 'margin', 'Profit margin improved this quarter.');
  assert.equal(cache2.getExact('model-a', 'margin', 'Profit margin improved this quarter.'), undefined);
});

test('inferTypoCorrection detects misspelled inputs while skipping valid inflections', () => {
  assert.equal(inferTypoCorrection('stakholder', 'stakeholder', false), 'stakholder');
  assert.equal(inferTypoCorrection('stakeholders', 'stakeholder', false), undefined);
  assert.equal(inferTypoCorrection('stakeholder', 'stakeholder', true), undefined);

  const baseNotFound: LookupResult = {
    word: 'stakholder',
    surface: 'stakholder',
    phonetic: '',
    pos: '',
    meaning_zh: '',
    source: 'not_found',
    suggestions: ['stakeholder'],
    found: false,
  };
  const apiCorrected: LookupResult = {
    word: 'stakeholder',
    surface: 'stakholder',
    phonetic: 'ˈsteɪkhəʊldə(r)',
    pos: 'n.',
    meaning_zh: '利益相关者',
    source: 'api',
    found: true,
  };
  const merged = mergeLookupEnrichment(baseNotFound, apiCorrected);
  assert.equal(merged.correctedFrom, 'stakholder');
  assert.equal(merged.suggestions, undefined);
});
