import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanToken, extractSentenceAt, segmentEnglishText } from './textTokenize';
import { condenseMeaningZh, lookupWord } from './dictionary';

test('cleanToken removes surrounding punctuation and possessives', () => {
  assert.equal(cleanToken("competitors'"), 'competitors');
  assert.equal(cleanToken("company's"), 'company');
  assert.equal(cleanToken('“suppliers,”'), 'suppliers');
  assert.equal(cleanToken('(hybrid)'), 'hybrid');
  assert.equal(cleanToken('real-time.'), 'real-time');
});

test('segmentEnglishText matches longest glossary phrase first', () => {
  const glossary = {
    'bargaining power': '议价能力',
    'bargaining power of suppliers': '供应商的议价能力',
    suppliers: '供应商',
  };
  const text = 'High bargaining power of suppliers can squeeze firm margins.';
  const segments = segmentEnglishText(text, glossary);
  const glossarySeg = segments.find((s) => s.type === 'glossary');

  assert.ok(glossarySeg, 'Expected a glossary segment');
  assert.equal(glossarySeg.glossaryKey, 'bargaining power of suppliers');
  assert.equal(glossarySeg.text.toLowerCase(), 'bargaining power of suppliers');
});

test('lookupWord prioritizes glossary over ECDICT', () => {
  const glossary = {
    'customer intimacy': '客户亲密度',
  };
  const res = lookupWord('customer intimacy', {
    glossary,
    matchedGlossaryKey: 'customer intimacy',
  });
  assert.equal(res.found, true);
  assert.equal(res.source, 'glossary');
  assert.equal(res.meaning_zh, '客户亲密度');
});

test('lookupWord distinguishes uppercase acronyms IS/IT from lowercase words', () => {
  const resIS = lookupWord('IS');
  assert.equal(resIS.found, true);
  assert.equal(resIS.source, 'acronym');
  assert.match(resIS.meaning_zh, /信息系统/);

  const resIT = lookupWord('IT');
  assert.equal(resIT.found, true);
  assert.equal(resIT.source, 'acronym');
  assert.match(resIT.meaning_zh, /信息技术/);

  // 小写 "is" 不应误判为信息系统，应还原到动词 be
  const resLowerIs = lookupWord('is');
  assert.equal(resLowerIs.found, true);
  assert.equal(resLowerIs.source, 'ecdict');
  assert.equal(resLowerIs.word, 'be');
});

test('lookupWord lemmatizes inflected forms via ECDICT exchange field', () => {
  const went = lookupWord('went');
  assert.equal(went.found, true);
  assert.equal(went.word, 'go');
  assert.equal(went.lemmaNote, 'went → go');

  const plans = lookupWord('plans');
  assert.equal(plans.found, true);
  assert.equal(plans.word, 'plan');

  const possessivePlural = lookupWord("competitors'");
  assert.equal(possessivePlural.found, true);
  assert.equal(possessivePlural.word, 'competitor');
});

test('lookupWord returns not_found for unknown words', () => {
  const res = lookupWord('xyzquuxword');
  assert.equal(res.found, false);
  assert.equal(res.source, 'not_found');
  assert.equal(res.meaning_zh, '');
});

test('condenseMeaningZh limits definitions to at most 3 senses', () => {
  const condensed = condenseMeaningZh('n. 一；二；三；四；五', 3);
  assert.equal(condensed, '一；二；三');
});

test('extractSentenceAt returns the containing sentence', () => {
  const text = 'First sentence here. A hybrid cloud combines private and public infrastructure. Last sentence.';
  const idx = text.indexOf('hybrid');
  assert.equal(
    extractSentenceAt(text, idx),
    'A hybrid cloud combines private and public infrastructure.',
  );
});

test('lookupWord enriches glossary match with ECDICT phonetic and alternative meanings', () => {
  const res = lookupWord('stakeholder', {
    glossary: { stakeholder: '利益相关者' },
    matchedGlossaryKey: 'stakeholder',
  });
  assert.equal(res.found, true);
  assert.equal(res.source, 'glossary');
  assert.equal(res.meaning_zh, '利益相关者');
  assert.ok(res.phonetic.length > 0);
  assert.ok(res.alternatives && res.alternatives.includes('股东'));
});
