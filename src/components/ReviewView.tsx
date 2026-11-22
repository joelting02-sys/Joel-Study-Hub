/**
 * 复习卡片页面（间隔重复：1 -> 3 -> 7 -> 14 天；忘了回到 1 天）
 * - 仅显示今天到期且状态为「学习中」的单词（「已学会」绝不出现）
 * - 正面：英文单词 + 音标 + 英文原句
 * - 背面：中文意思 + 科目与出处
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, RotateCcw } from 'lucide-react';
import type { FontScale, VocabEntry } from '../types/studyhub';
import { calculateNextReview, formatDateYmd, getDueReviewWords } from '../lib/vocabLogic';
import { InteractiveText, type WordClickPayload } from './InteractiveText';

interface ReviewViewProps {
  words: VocabEntry[];
  vocabLookupMap: Map<string, VocabEntry>;
  fontScale: FontScale;
  onRecordReview: (id: string, remembered: boolean) => Promise<void>;
  onWordClick: (payload: WordClickPayload) => void;
  onNavigateVocab: () => void;
}

const READING_SIZE_CLASS: Record<FontScale, string> = {
  normal: 'text-[17px] leading-[1.75]',
  large: 'text-[19px] leading-[1.8]',
  xlarge: 'text-[21px] leading-[1.85]',
};

export const ReviewView: React.FC<ReviewViewProps> = ({
  words,
  vocabLookupMap,
  fontScale,
  onRecordReview,
  onWordClick,
  onNavigateVocab,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const today = formatDateYmd();
  const dueWords = useMemo(() => getDueReviewWords(words, today), [words, today]);
  const currentCard = dueWords[0] ?? null;

  useEffect(() => {
    setRevealed(false);
  }, [currentCard?.id]);

  // 空格键翻开卡片背面
  useEffect(() => {
    if (!currentCard || revealed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setRevealed(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentCard, revealed]);

  const handleAnswer = async (remembered: boolean) => {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    try {
      await onRecordReview(currentCard.id, remembered);
      setCompletedCount((c) => c + 1);
      setRevealed(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentCard) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            每日复习
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            按 1 → 3 → 7 → 14 天间隔复习「学习中」的单词
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#131C31]">
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {completedCount > 0
              ? `太棒了！今日 ${completedCount} 个到期单词已全部复习完成`
              : '今日没有到期的复习单词'}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            已标记为「已学会」的单词不会再出现在复习队列中
          </p>
          <button
            type="button"
            onClick={onNavigateVocab}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            前往单词库查看全部词汇
          </button>
        </div>
      </div>
    );
  }

  const nextRemembered = calculateNextReview(currentCard.review.interval_days, true, today);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            每日复习
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            正面回忆中文意思，翻面后诚实选择「记得」或「忘了」
          </p>
        </div>
        <div className="text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">
          今日待复习 {dueWords.length} 词 · 已完成 {completedCount} 词
        </div>
      </div>

      <div
        data-testid="review-card"
        className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#131C31]"
      >
        {/* 元数据 */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {currentCard.subject} · {currentCard.source}
          </span>
          <span className="tabular-nums">
            当前间隔 {currentCard.review.interval_days} 天 · 已查询 {currentCard.lookup_count} 次
          </span>
        </div>

        {/* 正面：英文单词 + 音标 + 原句 */}
        <div className="mt-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {currentCard.word}
          </h2>
          {(currentCard.phonetic || currentCard.pos) && (
            <p className="mt-2 font-mono text-sm text-slate-500 dark:text-slate-400">
              {currentCard.phonetic ? `/${currentCard.phonetic}/` : ''}
              {currentCard.phonetic && currentCard.pos ? ' · ' : ''}
              {currentCard.pos}
            </p>
          )}
        </div>

        {currentCard.context && (
          <div
            className={`mt-8 rounded-lg border border-slate-200 bg-slate-50/70 p-5 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 ${READING_SIZE_CLASS[fontScale]}`}
          >
            {(() => {
              const escaped = currentCard.word
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const parts = escaped
                ? currentCard.context.split(
                    new RegExp(`(${escaped}(?:s|es|ed|ing|'s|’s|')?)`, 'gi'),
                  )
                : [currentCard.context];
              return parts.map((part, idx) =>
                idx % 2 === 1 ? (
                  <mark
                    key={idx}
                    className="rounded bg-blue-100 px-1 py-0.5 font-semibold text-blue-900 dark:bg-blue-900/60 dark:text-blue-200"
                  >
                    {part}
                  </mark>
                ) : (
                  <InteractiveText
                    key={idx}
                    text={part}
                    source={currentCard.source}
                    subject={currentCard.subject}
                    vocabLookupMap={vocabLookupMap}
                    onWordClick={onWordClick}
                  />
                ),
              );
            })()}
          </div>
        )}

        {/* 背面或翻面按钮 */}
        {!revealed ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Eye className="h-5 w-5" />
              <span>显示中文释义（Space）</span>
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">中文释义</p>
              <p
                data-testid="review-meaning-zh"
                className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50"
              >
                {currentCard.meaning_zh || '（暂无中文释义）'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleAnswer(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-base font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800/70 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/40"
              >
                <RotateCcw className="h-4 w-4" />
                <span>忘了（明天再复习）</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleAnswer(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Check className="h-4 w-4" />
                <span>记得（{nextRemembered.interval_days} 天后再复习）</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
