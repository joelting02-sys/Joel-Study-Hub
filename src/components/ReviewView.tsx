/**
 * 复习卡片页面（艾宾浩斯遗忘曲线：第 1 → 3 → 7 → 15 天，共 4 轮；忘了回到第 1 天）
 * - 仅显示今天到期且状态为「学习中」的单词（「已学会」绝不出现在待复习队列）
 * - 正面：英文单词 + 音标 + 英文原句
 * - 背面：中文意思 + 科目与出处；到了第 15 天最后一天可点「会了」直接记入「已学会」
 * - 顶部提供「已学会」按钮，方便随时查看所有已学会的内容并支持退回重新复习
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Award, Check, CheckCircle2, Eye, RotateCcw } from 'lucide-react';
import type {
  FontScale,
  SpeechAccent,
  SpeechEngine,
  SpeechRate,
  VocabEntry,
  VocabStatus,
} from '../types/studyhub';
import {
  calculateNextReview,
  formatDateYmd,
  getDueReviewWords,
  getReviewStageInfo,
} from '../lib/vocabLogic';
import { formatPhoneticDisplay } from '../lib/lookupHelpers';
import { speakWord } from '../lib/speech';
import { InteractiveText, StudyWordButton, type WordClickPayload } from './InteractiveText';
import { WordSpeakButton } from './WordSpeakButton';

interface ReviewViewProps {
  words: VocabEntry[];
  vocabLookupMap: Map<string, VocabEntry>;
  fontScale: FontScale;
  speechAccent: SpeechAccent;
  speechRate: SpeechRate;
  speechEngine: SpeechEngine;
  isPopoverOpen: boolean;
  onRecordReview: (id: string, remembered: boolean) => Promise<void>;
  onMarkWordStatus: (id: string, status: VocabStatus) => Promise<void>;
  onWordClick: (payload: WordClickPayload) => void;
  onNavigateVocab: () => void;
}

const READING_SIZE_CLASS: Record<FontScale, string> = {
  normal: 'text-[17px] leading-[1.75]',
  large: 'text-[19px] leading-[1.8]',
  xlarge: 'text-[21px] leading-[1.85]',
};

function formatLearnedDate(iso: string | null): string {
  if (!iso) return '已掌握';
  return iso.slice(0, 10);
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  words,
  vocabLookupMap,
  fontScale,
  speechAccent,
  speechRate,
  speechEngine,
  isPopoverOpen,
  onRecordReview,
  onMarkWordStatus,
  onWordClick,
  onNavigateVocab,
}) => {
  const [subTab, setSubTab] = useState<'due' | 'learned'>('due');
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [graduatedCount, setGraduatedCount] = useState(0);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const today = formatDateYmd();
  const dueWords = useMemo(() => getDueReviewWords(words, today), [words, today]);
  const learnedWords = useMemo(
    () =>
      words
        .filter((w) => w.status === 'learned')
        .sort((a, b) => (b.learned_at || b.added_at).localeCompare(a.learned_at || a.added_at)),
    [words],
  );
  const currentCard = dueWords[0] ?? null;

  useEffect(() => {
    setRevealed(false);
  }, [currentCard?.id]);

  // 空格键翻开卡片背面；R 键手动朗读当前单词（仅在显式按键时触发，绝不自动朗读）
  useEffect(() => {
    if (subTab !== 'due' || !currentCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (isPopoverOpen) return;
      if (!revealed && e.code === 'Space') {
        e.preventDefault();
        setRevealed(true);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void speakWord(currentCard.word, {
          accent: speechAccent,
          rate: speechRate,
          engine: speechEngine,
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [subTab, currentCard, revealed, isPopoverOpen, speechAccent, speechRate, speechEngine]);

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

  const handleGraduateLearned = async () => {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    try {
      await onMarkWordStatus(currentCard.id, 'learned');
      setCompletedCount((c) => c + 1);
      setGraduatedCount((c) => c + 1);
      setRevealed(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreLearning = async (id: string) => {
    setRestoringId(id);
    try {
      await onMarkWordStatus(id, 'learning');
    } finally {
      setRestoringId(null);
    }
  };

  const headerSection = (
    <div className="space-y-4 border-b border-slate-200 pb-5 dark:border-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            每日复习
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            艾宾浩斯遗忘曲线 4 轮间隔：第 1 → 3 → 7 → 15 天；最后一天点「会了」即记入「已学会」
          </p>
        </div>
        <div className="text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">
          今日待复习 {dueWords.length} 词 · 本次完成 {completedCount} 词
          {graduatedCount > 0 ? `（含会了 ${graduatedCount} 词）` : ''}
        </div>
      </div>

      {/* 复习页内置「待复习 / 已学会」切换按钮 */}
      <div
        role="tablist"
        aria-label="复习视图切换"
        className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit dark:bg-slate-800/80"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'due'}
          onClick={() => setSubTab('due')}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold tabular-nums transition-colors whitespace-nowrap ${
            subTab === 'due'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          今日待复习 ({dueWords.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'learned'}
          onClick={() => setSubTab('learned')}
          className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold tabular-nums transition-colors whitespace-nowrap ${
            subTab === 'learned'
              ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>已学会 ({learnedWords.length})</span>
        </button>
      </div>
    </div>
  );

  if (subTab === 'learned') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {headerSection}

        {learnedWords.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#131C31]">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              还没有记录「已学会」的单词
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              在复习时点「会了」或「已会了」，就会自动收录到这里
            </p>
            <button
              type="button"
              onClick={() => setSubTab('due')}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              返回今日复习
            </button>
          </div>
        ) : (
          <div
            data-testid="review-learned-list"
            className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-[#131C31]"
          >
            {learnedWords.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <StudyWordButton
                      word={item.word}
                      dataStudyWord={item.word}
                      className="study-word cursor-pointer text-left text-lg font-bold text-slate-900 dark:text-slate-50"
                      onTrigger={(rect, trigger) =>
                        onWordClick({
                          surface: item.word,
                          sentence: item.context,
                          anchorRect: rect,
                          source: item.source || '复习已学会',
                          subject: item.subject,
                          trigger,
                        })
                      }
                    />
                    <WordSpeakButton
                      text={item.word}
                      accent={speechAccent}
                      rate={speechRate}
                      engine={speechEngine}
                    />
                    {formatPhoneticDisplay(item.phonetic) && (
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatPhoneticDisplay(item.phonetic)}
                      </span>
                    )}
                    {item.pos && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{item.pos}</span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>已学会 · {formatLearnedDate(item.learned_at)}</span>
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {item.meaning_zh || '（暂无中文释义）'}
                  </p>

                  {item.context && (
                    <p
                      data-study-selectable="true"
                      data-study-source={item.source || '复习已学会'}
                      data-study-subject={item.subject}
                      className="text-xs leading-relaxed text-slate-500 dark:text-slate-400"
                    >
                      <InteractiveText
                        text={item.context}
                        source={item.source}
                        subject={item.subject}
                        vocabLookupMap={vocabLookupMap}
                        onWordClick={onWordClick}
                      />
                    </p>
                  )}

                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {item.subject} · {item.source} · 已累计查询 {item.lookup_count} 次
                  </p>
                </div>

                <button
                  type="button"
                  disabled={restoringId === item.id}
                  onClick={() => void handleRestoreLearning(item.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{restoringId === item.id ? '处理中…' : '重回复习'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {headerSection}

        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#131C31]">
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {completedCount > 0
              ? `太棒了！今日 ${completedCount} 个到期单词已全部复习完成`
              : '今日没有到期的复习单词'}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            已标记为「已学会」的单词不会再出现在复习队列中
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {learnedWords.length > 0 && (
              <button
                type="button"
                onClick={() => setSubTab('learned')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>查看已学会记录 ({learnedWords.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateVocab}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              前往单词库查看全部词汇
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nextRemembered = calculateNextReview(currentCard.review.interval_days, true, today);
  const stageInfo = getReviewStageInfo(currentCard.review.interval_days);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {headerSection}

      <div
        data-testid="review-card"
        className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#131C31]"
      >
        {/* 元数据与艾宾浩斯进度 */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {currentCard.subject} · {currentCard.source}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 font-semibold tabular-nums ${
                stageInfo.isFinalStage
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
              }`}
            >
              第 {stageInfo.stage}/{stageInfo.totalStages} 轮 ·{' '}
              {stageInfo.isFinalStage
                ? `第 ${currentCard.review.interval_days} 天（最后一轮）`
                : `当前间隔 ${currentCard.review.interval_days} 天`}
            </span>
            <span className="tabular-nums">已查询 {currentCard.lookup_count} 次</span>
          </div>
        </div>

        {/* 正面：英文单词 + 小播放键 + 音标 + 原句 */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center justify-center gap-2.5">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {currentCard.word}
            </h2>
            <WordSpeakButton
              text={currentCard.word}
              accent={speechAccent}
              rate={speechRate}
              engine={speechEngine}
              size="sm"
              title={`点我朗读 ${currentCard.word} (快捷键 R)`}
            />
          </div>
          {(formatPhoneticDisplay(currentCard.phonetic) || currentCard.pos) && (
            <p className="mt-2 font-mono text-sm text-slate-500 dark:text-slate-400">
              {formatPhoneticDisplay(currentCard.phonetic)}
              {formatPhoneticDisplay(currentCard.phonetic) && currentCard.pos ? ' · ' : ''}
              {currentCard.pos}
            </p>
          )}
        </div>

        {currentCard.context && (
          <div
            data-study-selectable="true"
            data-study-source={currentCard.source}
            data-study-subject={currentCard.subject}
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
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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

            {stageInfo.isFinalStage ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleAnswer(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800/70 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/40"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>忘了（回到第 1 天）</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleAnswer(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Check className="h-4 w-4" />
                  <span>再按 15 天复习</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleGraduateLearned()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                >
                  <Award className="h-4 w-4" />
                  <span>会了（记入已学会）</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
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
                    <span>记得（第 {nextRemembered.interval_days} 天后再复习）</span>
                  </button>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleGraduateLearned()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>已彻底会了，提前记入「已学会」</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
