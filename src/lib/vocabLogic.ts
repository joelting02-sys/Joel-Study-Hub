/**
 * 单词库与间隔复习纯业务逻辑（与 UI/IO 解耦，可直接用 node:test 测试）
 */

import type {
  SubjectCode,
  VocabEntry,
  VocabInboxItem,
  VocabStatus,
} from '../types/studyhub.ts';
import { SUBJECT_OPTIONS } from '../types/studyhub.ts';

/** 记忆曲线间隔阶梯：1 -> 3 -> 7 -> 14 天 */
export const REVIEW_INTERVAL_STEPS = [1, 3, 7, 14] as const;

export function normalizeWordKey(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeSubject(subject?: string): SubjectCode {
  if (!subject) return '其他';
  const upper = subject.trim().toUpperCase();
  if (upper === 'ICT' || upper === 'BE' || upper === 'ES' || upper === 'BO') {
    return upper;
  }
  return SUBJECT_OPTIONS.includes(subject as SubjectCode) ? (subject as SubjectCode) : '其他';
}

/**
 * 获取本地日期字符串 YYYY-MM-DD
 */
export function formatDateYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 在 YYYY-MM-DD 基础上加 N 天
 */
export function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/**
 * 计算下一次复习计划：
 * - 记得：1 -> 3 -> 7 -> 14 天（达到 14 天保持 14 天）
 * - 忘了：回到 1 天
 */
export function calculateNextReview(
  currentIntervalDays: number,
  remembered: boolean,
  todayYmd: string = formatDateYmd(),
): { next_review: string; interval_days: number } {
  if (!remembered) {
    return {
      interval_days: 1,
      next_review: addDaysToYmd(todayYmd, 1),
    };
  }

  let nextInterval: number = 14;
  for (const step of REVIEW_INTERVAL_STEPS) {
    if (step > currentIntervalDays) {
      nextInterval = step;
      break;
    }
  }

  return {
    interval_days: nextInterval,
    next_review: addDaysToYmd(todayYmd, nextInterval),
  };
}

export interface AddVocabInput {
  word: string;
  meaning_zh: string;
  phonetic?: string;
  pos?: string;
  context?: string;
  source?: string;
  subject?: string;
}

/**
 * 加入单词库或递增 lookup_count：
 * - 同一个词（忽略大小写）重复加入不重复创建，只把 lookup_count + 1
 */
export function addOrIncrementVocab(
  words: VocabEntry[],
  input: AddVocabInput,
  options: { now?: Date; idFactory?: () => string } = {},
): { words: VocabEntry[]; entry: VocabEntry; isNew: boolean } {
  const now = options.now ?? new Date();
  const idFactory =
    options.idFactory ??
    (() =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  const key = normalizeWordKey(input.word);
  const existingIdx = words.findIndex((w) => normalizeWordKey(w.word) === key);

  if (existingIdx !== -1) {
    const existing = words[existingIdx];
    const updated: VocabEntry = {
      ...existing,
      lookup_count: existing.lookup_count + 1,
      // 如果旧条目没有中文释义而本次提供了，则补充
      meaning_zh: existing.meaning_zh || input.meaning_zh.trim(),
      phonetic: existing.phonetic || (input.phonetic ?? '').trim(),
      pos: existing.pos || (input.pos ?? '').trim(),
    };
    const nextWords = [...words];
    nextWords[existingIdx] = updated;
    return { words: nextWords, entry: updated, isNew: false };
  }

  const todayYmd = formatDateYmd(now);
  const newEntry: VocabEntry = {
    id: idFactory(),
    word: input.word.trim(),
    meaning_zh: input.meaning_zh.trim(),
    phonetic: (input.phonetic ?? '').trim(),
    pos: (input.pos ?? '').trim(),
    context: (input.context ?? '').trim(),
    source: (input.source ?? '').trim() || '粘贴的文本',
    subject: normalizeSubject(input.subject),
    status: 'learning',
    added_at: now.toISOString(),
    learned_at: null,
    lookup_count: 1,
    review: {
      next_review: addDaysToYmd(todayYmd, 1),
      interval_days: 1,
    },
  };

  return {
    words: [newEntry, ...words],
    entry: newEntry,
    isNew: true,
  };
}

/**
 * 合并来自 vocab_inbox/*.json 的建议单词（按 word 去重，已存在则跳过不覆盖，新增设为 learning）
 */
export function mergeInboxWords(
  words: VocabEntry[],
  inboxItems: VocabInboxItem[],
  options: { now?: Date; idFactory?: () => string } = {},
): { words: VocabEntry[]; addedCount: number } {
  const existingKeys = new Set(words.map((w) => normalizeWordKey(w.word)));
  let current = [...words];
  let addedCount = 0;

  for (const item of inboxItems) {
    if (!item || typeof item.word !== 'string' || !item.word.trim()) continue;
    const key = normalizeWordKey(item.word);
    if (existingKeys.has(key)) continue;

    const res = addOrIncrementVocab(
      current,
      {
        word: item.word,
        meaning_zh: item.meaning_zh ?? '',
        phonetic: item.phonetic ?? '',
        pos: item.pos ?? '',
        context: item.context ?? '',
        source: item.source ?? 'AI 私教推荐',
        subject: item.subject ?? '其他',
      },
      options,
    );
    current = res.words;
    existingKeys.add(key);
    addedCount++;
  }

  return { words: current, addedCount };
}

/**
 * 手动切换状态（学习中 <-> 已学会）
 */
export function markWordStatus(
  words: VocabEntry[],
  id: string,
  status: VocabStatus,
  now: Date = new Date(),
): VocabEntry[] {
  return words.map((w) => {
    if (w.id !== id) return w;
    return {
      ...w,
      status,
      learned_at: status === 'learned' ? now.toISOString() : null,
    };
  });
}

/**
 * 获取今天到期的「学习中」单词（已学会的词绝不出现在复习里）
 */
export function getDueReviewWords(
  words: VocabEntry[],
  todayYmd: string = formatDateYmd(),
): VocabEntry[] {
  return words
    .filter((w) => w.status === 'learning' && w.review.next_review <= todayYmd)
    .sort((a, b) => a.review.next_review.localeCompare(b.review.next_review));
}

export interface VocabFilterOptions {
  status: VocabStatus;
  subject: 'ALL' | SubjectCode;
  search: string;
  sortBy: 'added_desc' | 'lookup_desc';
}

export function filterAndSortVocab(
  words: VocabEntry[],
  options: VocabFilterOptions,
): VocabEntry[] {
  const q = options.search.trim().toLowerCase();
  const filtered = words.filter((w) => {
    if (w.status !== options.status) return false;
    if (options.subject !== 'ALL' && w.subject !== options.subject) return false;
    if (q) {
      const hay = `${w.word} ${w.meaning_zh} ${w.context} ${w.source}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (options.sortBy === 'lookup_desc') {
      if (b.lookup_count !== a.lookup_count) return b.lookup_count - a.lookup_count;
    }
    return b.added_at.localeCompare(a.added_at);
  });
}

/**
 * 自动导出 exports/单词库.md（给 Obsidian / Anki 使用）
 * 格式：表格（单词｜中文｜原句｜科目｜状态）
 */
export function exportVocabToMarkdown(words: VocabEntry[]): string {
  const escapeCell = (val: string) =>
    (val || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();

  const header = [
    '# StudyHub 单词库',
    '',
    `> 共 ${words.length} 词 · 学习中 ${words.filter((w) => w.status === 'learning').length} · 已学会 ${words.filter((w) => w.status === 'learned').length}`,
    '',
    '| 单词 | 中文 | 原句 | 科目 | 状态 |',
    '| --- | --- | --- | --- | --- |',
  ];

  const rows = words.map((w) => {
    const statusLabel = w.status === 'learned' ? '已学会' : '学习中';
    return `| ${escapeCell(w.word)} | ${escapeCell(w.meaning_zh)} | ${escapeCell(w.context)} | ${escapeCell(w.subject)} | ${statusLabel} |`;
  });

  return [...header, ...rows, ''].join('\n');
}
