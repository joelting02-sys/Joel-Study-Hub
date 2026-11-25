import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addOrIncrementVocab,
  calculateNextReview,
  exportVocabToMarkdown,
  filterAndSortVocab,
  getDueReviewWords,
  getReviewStageInfo,
  markWordStatus,
  mergeInboxWords,
} from './vocabLogic';

test('addOrIncrementVocab avoids duplicates and increments lookup_count', () => {
  const now = new Date('2026-11-21T10:00:00Z');
  const first = addOrIncrementVocab(
    [],
    {
      word: 'bargaining power',
      meaning_zh: '议价能力',
      context: 'Suppliers have strong bargaining power.',
      source: 'ICT 4113 · Q1',
      subject: 'ICT',
    },
    { now, idFactory: () => 'id-1' },
  );

  assert.equal(first.isNew, true);
  assert.equal(first.words.length, 1);
  assert.equal(first.entry.lookup_count, 1);
  assert.equal(first.entry.status, 'learning');
  assert.equal(first.entry.review.interval_days, 1);

  const second = addOrIncrementVocab(
    first.words,
    {
      word: 'Bargaining Power',
      meaning_zh: '议价能力',
      context: 'Another sentence.',
      source: 'ICT 4113 · Q2',
      subject: 'ICT',
    },
    { now, idFactory: () => 'id-2' },
  );

  assert.equal(second.isNew, false);
  assert.equal(second.words.length, 1);
  assert.equal(second.entry.id, 'id-1');
  assert.equal(second.entry.lookup_count, 2);
});

test('calculateNextReview follows 1 -> 3 -> 7 -> 15 and resets to 1 when forgotten', () => {
  assert.deepEqual(calculateNextReview(1, true, '2026-11-21'), {
    interval_days: 3,
    next_review: '2026-11-24',
  });
  assert.deepEqual(calculateNextReview(3, true, '2026-11-24'), {
    interval_days: 7,
    next_review: '2026-12-01',
  });
  assert.deepEqual(calculateNextReview(7, true, '2026-12-01'), {
    interval_days: 15,
    next_review: '2026-12-16',
  });
  assert.deepEqual(calculateNextReview(15, true, '2026-12-16'), {
    interval_days: 15,
    next_review: '2026-12-31',
  });
  assert.deepEqual(calculateNextReview(7, false, '2026-12-01'), {
    interval_days: 1,
    next_review: '2026-12-02',
  });

  assert.deepEqual(getReviewStageInfo(1), { stage: 1, totalStages: 4, isFinalStage: false });
  assert.deepEqual(getReviewStageInfo(3), { stage: 2, totalStages: 4, isFinalStage: false });
  assert.deepEqual(getReviewStageInfo(7), { stage: 3, totalStages: 4, isFinalStage: false });
  assert.deepEqual(getReviewStageInfo(15), { stage: 4, totalStages: 4, isFinalStage: true });
});

test('learned words never appear in due review list', () => {
  const now = new Date('2026-11-20T08:00:00Z');
  const { words: w1 } = addOrIncrementVocab(
    [],
    { word: 'scalability', meaning_zh: '可扩展性', subject: 'ICT' },
    { now, idFactory: () => 'id-1' },
  );
  const { words: w2 } = addOrIncrementVocab(
    w1,
    { word: 'elasticity', meaning_zh: '弹性', subject: 'BE' },
    { now, idFactory: () => 'id-2' },
  );

  // Both have next_review = 2026-11-21, so both due on 2026-11-21
  assert.equal(getDueReviewWords(w2, '2026-11-21').length, 2);

  // Mark id-1 as learned -> only id-2 should remain in review
  const updated = markWordStatus(w2, 'id-1', 'learned', now);
  const due = getDueReviewWords(updated, '2026-11-21');
  assert.equal(due.length, 1);
  assert.equal(due[0].id, 'id-2');
});

test('mergeInboxWords deduplicates existing words and adds new ones as learning', () => {
  const now = new Date('2026-11-21T08:00:00Z');
  const { words: initial } = addOrIncrementVocab(
    [],
    { word: 'hybrid cloud', meaning_zh: '混合云', subject: 'ICT' },
    { now, idFactory: () => 'id-1' },
  );

  const merged = mergeInboxWords(
    initial,
    [
      { word: 'Hybrid Cloud', meaning_zh: '重复词', subject: 'ICT' },
      { word: 'switching costs', meaning_zh: '转换成本', subject: 'ICT', context: 'High switching costs lock in customers.' },
    ],
    { now, idFactory: () => 'id-2' },
  );

  assert.equal(merged.addedCount, 1);
  assert.equal(merged.words.length, 2);
  assert.equal(merged.words.find((w) => w.word === 'switching costs')?.status, 'learning');
});

test('filterAndSortVocab supports subject filter and sorting by lookup_count', () => {
  const t1 = new Date('2026-11-20T10:00:00Z');
  const t2 = new Date('2026-11-21T10:00:00Z');
  let list = addOrIncrementVocab([], { word: 'alpha', meaning_zh: '甲', subject: 'ICT' }, { now: t1, idFactory: () => '1' }).words;
  list = addOrIncrementVocab(list, { word: 'alpha', meaning_zh: '甲', subject: 'ICT' }, { now: t1 }).words;
  list = addOrIncrementVocab(list, { word: 'beta', meaning_zh: '乙', subject: 'ICT' }, { now: t2, idFactory: () => '2' }).words;
  list = addOrIncrementVocab(list, { word: 'gamma', meaning_zh: '丙', subject: 'BE' }, { now: t2, idFactory: () => '3' }).words;

  const sorted = filterAndSortVocab(list, {
    status: 'learning',
    subject: 'ICT',
    search: '',
    sortBy: 'lookup_desc',
  });

  assert.equal(sorted.length, 2);
  assert.equal(sorted[0].word, 'alpha');
  assert.equal(sorted[0].lookup_count, 2);
});

test('exportVocabToMarkdown produces clean Markdown table', () => {
  const { words } = addOrIncrementVocab(
    [],
    {
      word: 'hybrid cloud',
      meaning_zh: '混合云',
      context: 'A hybrid cloud links private & public clouds.',
      subject: 'ICT',
    },
    { now: new Date('2026-11-21T10:00:00Z'), idFactory: () => '1' },
  );
  const md = exportVocabToMarkdown(words);
  assert.match(md, /\| 单词 \| 中文 \| 原句 \| 科目 \| 状态 \|/);
  assert.match(md, /\| hybrid cloud \| 混合云 \| A hybrid cloud links private & public clouds\. \| ICT \| 学习中 \|/);
});
