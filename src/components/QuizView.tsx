/**
 * 测验模式页面
 * - 自动读取 StudyHub/quizzes/*.json（由 AI 私教生成并实时监听）
 * - 核心交互规则：
 *   - 点选项里的英文单词 = 只查词翻译，绝对不会误触发作答
 *   - 作答只能点左侧字母按钮 A/B/C/D、选项空白处，或按键盘 1–4
 * - 支持 Hint、Skip、进度条、即时解析、错题总结，并自动写入 results/<quiz_id>_<时间>.json
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  SkipForward,
  XCircle,
} from 'lucide-react';
import type {
  FontScale,
  QuizFile,
  QuizResultFile,
  SubjectCode,
  VocabEntry,
} from '../types/studyhub';
import { gradeQuiz, type QuizGradeSummary } from '../lib/quizLogic';
import { extractErrorMessage } from '../lib/errors';
import type { WordClickPayload } from './InteractiveText';
import { MarkdownContent } from './MarkdownContent';

interface QuizViewProps {
  quizzes: QuizFile[];
  results: QuizResultFile[];
  vocabLookupMap: Map<string, VocabEntry>;
  fontScale: FontScale;
  isPopoverOpen: boolean;
  onWordClick: (payload: WordClickPayload) => void;
  onSaveResult: (filename: string, result: QuizResultFile) => Promise<void>;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const READING_SIZE_CLASS: Record<FontScale, string> = {
  normal: 'text-[17px] leading-[1.75]',
  large: 'text-[19px] leading-[1.8]',
  xlarge: 'text-[21px] leading-[1.85]',
};

export const QuizView: React.FC<QuizViewProps> = ({
  quizzes,
  results,
  vocabLookupMap,
  fontScale,
  isPopoverOpen,
  onWordClick,
  onSaveResult,
}) => {
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectCode>('ALL');
  const [activeQuiz, setActiveQuiz] = useState<QuizFile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<
    Record<string, { chosen_index: number; used_hint: boolean }>
  >({});
  const [hintRevealedMap, setHintRevealedMap] = useState<Record<string, boolean>>({});
  const [lookedUpWords, setLookedUpWords] = useState<string[]>([]);
  const [gradeSummary, setGradeSummary] = useState<QuizGradeSummary | null>(null);
  const [saveNotice, setSaveNotice] = useState<string>('');

  const availableSubjects = useMemo(() => {
    const seen = new Set<string>();
    for (const q of quizzes) {
      if (q.subject) seen.add(q.subject);
    }
    return Array.from(seen);
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    if (subjectFilter === 'ALL') return quizzes;
    return quizzes.filter((q) => q.subject === subjectFilter);
  }, [quizzes, subjectFilter]);

  const latestResultByQuizId = useMemo(() => {
    const map = new Map<string, QuizResultFile>();
    for (const r of results) {
      if (!map.has(r.quiz_id)) {
        map.set(r.quiz_id, r);
      }
    }
    return map;
  }, [results]);

  const startQuiz = (quiz: QuizFile) => {
    setActiveQuiz(quiz);
    setCurrentIndex(0);
    setAnswersMap({});
    setHintRevealedMap({});
    setLookedUpWords([]);
    setGradeSummary(null);
    setSaveNotice('');
  };

  const handleQuizWordClick = useCallback(
    (payload: WordClickPayload) => {
      const token = payload.matchedGlossaryKey || payload.surface;
      setLookedUpWords((prev) => (prev.includes(token) ? prev : [...prev, token]));
      onWordClick(payload);
    },
    [onWordClick],
  );

  const currentQuestion = activeQuiz ? activeQuiz.questions[currentIndex] : null;
  const currentAnswer = currentQuestion ? answersMap[currentQuestion.id] : undefined;
  const isAnswered = currentAnswer !== undefined;

  const selectAnswer = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion || isAnswered) return;
      if (optionIndex < 0 || optionIndex >= currentQuestion.options.length) return;
      setAnswersMap((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          chosen_index: optionIndex,
          used_hint: Boolean(hintRevealedMap[currentQuestion.id]),
        },
      }));
    },
    [currentQuestion, isAnswered, hintRevealedMap],
  );

  const finishQuiz = useCallback(
    async (finalAnswers: Record<string, { chosen_index: number; used_hint: boolean }>) => {
      if (!activeQuiz) return;
      const graded = gradeQuiz(activeQuiz, finalAnswers, lookedUpWords);
      setGradeSummary(graded);
      try {
        await onSaveResult(graded.filename, graded.result);
        setSaveNotice(`results/${graded.filename}`);
      } catch (err) {
        setSaveNotice(
          `结果保存失败：${extractErrorMessage(err, '未知错误')}`,
        );
      }
    },
    [activeQuiz, lookedUpWords, onSaveResult],
  );

  const handleNext = useCallback(() => {
    if (!activeQuiz) return;
    if (currentIndex + 1 < activeQuiz.questions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      void finishQuiz(answersMap);
    }
  }, [activeQuiz, currentIndex, answersMap, finishQuiz]);

  const handleSkip = useCallback(() => {
    if (!activeQuiz || !currentQuestion) return;
    const nextAnswers = {
      ...answersMap,
      [currentQuestion.id]: {
        chosen_index: -1,
        used_hint: Boolean(hintRevealedMap[currentQuestion.id]),
      },
    };
    setAnswersMap(nextAnswers);
    if (currentIndex + 1 < activeQuiz.questions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      void finishQuiz(nextAnswers);
    }
  }, [activeQuiz, currentQuestion, answersMap, hintRevealedMap, currentIndex, finishQuiz]);

  const handleRevealHint = () => {
    if (!currentQuestion) return;
    setHintRevealedMap((prev) => ({ ...prev, [currentQuestion.id]: true }));
  };

  // 键盘快捷键：1–4 作答（弹窗关闭且未聚焦输入框时）；Enter 进入下一题
  useEffect(() => {
    if (!activeQuiz || gradeSummary || !currentQuestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (isPopoverOpen) return;

      if (!isAnswered && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < currentQuestion.options.length) {
          e.preventDefault();
          selectAnswer(idx);
        }
      } else if (isAnswered && e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuiz, gradeSummary, currentQuestion, isAnswered, isPopoverOpen, selectAnswer, handleNext]);

  // ==================== 视图 1：测验成绩报告 ====================
  if (activeQuiz && gradeSummary) {
    const { result, passed, wrongQuestions } = gradeSummary;
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {activeQuiz.subject} · 测验结果报告
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {activeQuiz.title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => startQuiz(activeQuiz)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              <span>再做一次</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveQuiz(null);
                setGradeSummary(null);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回测验列表</span>
            </button>
          </div>
        </div>

        {/* 核心成绩概览（单层干净表面，无花哨嵌套卡片） */}
        <section
          aria-label="成绩统计"
          className="grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-3 dark:border-slate-800 dark:bg-[#131C31]"
        >
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">本次得分</p>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {result.score}
              <span className="text-xl font-normal text-slate-400"> / {result.total}</span>
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">正确率（及格线 {activeQuiz.pass_rate}%）</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-mono text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                {result.percent}%
              </span>
              <span
                className={
                  passed
                    ? 'inline-flex items-center gap-1 text-base font-semibold text-emerald-700 dark:text-emerald-400'
                    : 'inline-flex items-center gap-1 text-base font-semibold text-red-700 dark:text-red-400'
                }
              >
                {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {passed ? '已及格' : '未及格'}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">结果文件已自动写出</p>
            <p className="mt-2 break-all font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {saveNotice || '保存中…'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              AI 私教可直接读取此结果文件分析薄弱点
            </p>
          </div>
        </section>

        {/* 本次查询过的单词 */}
        {result.words_looked_up.length > 0 && (
          <section className="space-y-2 border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              本次点词查询记录（{result.words_looked_up.length} 词）
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {result.words_looked_up.join(' · ')}
            </p>
          </section>
        )}

        {/* 错题列表 */}
        <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {wrongQuestions.length > 0
              ? `错题与未作答回顾（${wrongQuestions.length} 题）`
              : '全部答对，没有错题'}
          </h2>

          {wrongQuestions.length > 0 && (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-[#131C31]">
              {wrongQuestions.map(({ question, index, chosenIndex }) => (
                <article key={question.id} className="space-y-3 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-medium">
                      第 {index + 1} 题 · {question.id}
                    </span>
                    {question.source && <span>{question.source}</span>}
                  </div>

                  <div
                    data-study-selectable="true"
                    data-study-source={`${activeQuiz.title} · Q${index + 1}`}
                    data-study-subject={activeQuiz.subject}
                    className={`${READING_SIZE_CLASS[fontScale]} text-slate-900 dark:text-slate-100`}
                  >
                    <MarkdownContent
                      text={question.stem}
                      interactive
                      glossary={activeQuiz.glossary}
                      source={`${activeQuiz.title} · Q${index + 1}`}
                      subject={activeQuiz.subject}
                      vocabLookupMap={vocabLookupMap}
                      onWordClick={handleQuizWordClick}
                    />
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="space-y-1 text-red-700 dark:text-red-400">
                      <span className="font-medium">你的选择：</span>
                      {chosenIndex >= 0 ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="shrink-0 font-mono font-semibold">{OPTION_LETTERS[chosenIndex]}.</span>
                          <div className="min-w-0 flex-1">
                            <MarkdownContent
                              text={question.options[chosenIndex]}
                              interactive
                              compact
                              glossary={activeQuiz.glossary}
                              source={`${activeQuiz.title} · Q${index + 1}`}
                              subject={activeQuiz.subject}
                              vocabLookupMap={vocabLookupMap}
                              onWordClick={handleQuizWordClick}
                            />
                          </div>
                        </div>
                      ) : (
                        <span>已跳过</span>
                      )}
                    </div>
                    <div className="space-y-1 font-medium text-emerald-700 dark:text-emerald-400">
                      <span>正确答案：</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="shrink-0 font-mono font-semibold">{OPTION_LETTERS[question.correct_index]}.</span>
                        <div className="min-w-0 flex-1">
                          <MarkdownContent
                            text={question.options[question.correct_index]}
                            interactive
                            compact
                            glossary={activeQuiz.glossary}
                            source={`${activeQuiz.title} · Q${index + 1}`}
                            subject={activeQuiz.subject}
                            vocabLookupMap={vocabLookupMap}
                            onWordClick={handleQuizWordClick}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">解析：</p>
                    <MarkdownContent
                      text={question.explanation_zh}
                      interactive
                      compact
                      glossary={activeQuiz.glossary}
                      source={`${activeQuiz.title} · Q${index + 1}`}
                      subject={activeQuiz.subject}
                      vocabLookupMap={vocabLookupMap}
                      onWordClick={handleQuizWordClick}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ==================== 视图 2：答题进行中 ====================
  if (activeQuiz && currentQuestion) {
    const progressPercent = Math.round(((currentIndex + 1) / activeQuiz.questions.length) * 100);
    const isHintVisible = Boolean(hintRevealedMap[currentQuestion.id]);
    const questionSource = `${activeQuiz.title} · Q${currentIndex + 1}`;
    const isCorrectAnswer =
      isAnswered && currentAnswer.chosen_index === currentQuestion.correct_index;

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 顶部栏与进度条 */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveQuiz(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回列表</span>
            </button>

            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {activeQuiz.title}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                第 {currentIndex + 1} / {activeQuiz.questions.length} 题
              </span>
            </div>
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="答题进度"
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-transform duration-200 dark:bg-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 题目主面板 */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#131C31]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {currentQuestion.type === 'true_false' ? '判断题' : '单选题'} · 点英文单词查词翻译 ·
              点左侧字母、选项空白处或按 1–{currentQuestion.options.length} 作答
            </span>
            {currentQuestion.source && <span>{currentQuestion.source}</span>}
          </div>

          {/* 英文题干（支持 Markdown 排版 + 每个英文单词均可点词翻译） */}
          <div
            data-testid="quiz-question-stem"
            data-study-selectable="true"
            data-study-source={questionSource}
            data-study-subject={activeQuiz.subject}
            className={`mt-5 font-medium text-slate-900 dark:text-slate-50 ${READING_SIZE_CLASS[fontScale]}`}
          >
            <MarkdownContent
              text={currentQuestion.stem}
              interactive
              glossary={activeQuiz.glossary}
              source={questionSource}
              subject={activeQuiz.subject}
              vocabLookupMap={vocabLookupMap}
              onWordClick={handleQuizWordClick}
            />
          </div>

          {/* 提示区域 */}
          {isHintVisible && currentQuestion.hint && (
            <div
              data-study-selectable="true"
              data-study-source={questionSource}
              data-study-subject={activeQuiz.subject}
              className="mt-5 space-y-1 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200"
            >
              <p className="font-semibold">提示：</p>
              <MarkdownContent
                text={currentQuestion.hint}
                interactive
                compact
                glossary={activeQuiz.glossary}
                source={questionSource}
                subject={activeQuiz.subject}
                vocabLookupMap={vocabLookupMap}
                onWordClick={handleQuizWordClick}
              />
            </div>
          )}

          {/* 选项列表（严格分离：点单词不作答，点字母按钮或选项空白处作答） */}
          <div className="mt-6 space-y-3" data-testid="quiz-options-list">
            {currentQuestion.options.map((optText, idx) => {
              const letter = OPTION_LETTERS[idx] || String(idx + 1);
              const isChosen = isAnswered && currentAnswer.chosen_index === idx;
              const isRight = idx === currentQuestion.correct_index;

              let rowStyle =
                'border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-blue-700 dark:hover:bg-blue-950/30';
              let letterBtnStyle =
                'border-slate-300 bg-white text-slate-700 hover:border-blue-600 hover:bg-blue-600 hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-blue-500';

              if (isAnswered) {
                if (isRight) {
                  rowStyle =
                    'border-emerald-300 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/35';
                  letterBtnStyle =
                    'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500';
                } else if (isChosen) {
                  rowStyle =
                    'border-red-300 bg-red-50/70 dark:border-red-800 dark:bg-red-950/35';
                  letterBtnStyle =
                    'border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500';
                } else {
                  rowStyle =
                    'border-slate-200 bg-white opacity-70 dark:border-slate-800 dark:bg-slate-900/30';
                }
              }

              return (
                <div
                  key={idx}
                  data-testid={`quiz-option-${idx}`}
                  onClick={() => {
                    const sel = window.getSelection()?.toString().trim();
                    if (sel) return;
                    selectAnswer(idx);
                  }}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                    isAnswered ? '' : 'cursor-pointer'
                  } ${rowStyle}`}
                >
                  <button
                    type="button"
                    disabled={isAnswered}
                    aria-label={`选择选项 ${letter}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAnswer(idx);
                    }}
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${letterBtnStyle}`}
                  >
                    {letter}
                  </button>

                  <div
                    data-study-selectable="true"
                    data-study-source={questionSource}
                    data-study-subject={activeQuiz.subject}
                    className={`min-w-0 flex-1 pt-0.5 text-slate-800 dark:text-slate-100 ${READING_SIZE_CLASS[fontScale]}`}
                  >
                    <MarkdownContent
                      text={optText}
                      interactive
                      compact
                      glossary={activeQuiz.glossary}
                      source={questionSource}
                      subject={activeQuiz.subject}
                      vocabLookupMap={vocabLookupMap}
                      onWordClick={handleQuizWordClick}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 作答后显示正确答案与中文解析 */}
          {isAnswered && (
            <div
              data-testid="quiz-answer-feedback"
              className={`mt-6 rounded-xl border p-5 ${
                isCorrectAnswer
                  ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/70 dark:bg-emerald-950/30'
                  : 'border-red-200 bg-red-50/60 dark:border-red-800/70 dark:bg-red-950/30'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`inline-flex items-center gap-2 text-base font-semibold ${
                    isCorrectAnswer
                      ? 'text-emerald-800 dark:text-emerald-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}
                >
                  {isCorrectAnswer ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span>回答正确</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5" />
                      <span>
                        回答错误 · 正确答案是 {OPTION_LETTERS[currentQuestion.correct_index]}
                      </span>
                    </>
                  )}
                </p>
                {currentQuestion.source && (
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    出处：{currentQuestion.source}
                  </span>
                )}
              </div>
              <div
                data-study-selectable="true"
                data-study-source={questionSource}
                data-study-subject={activeQuiz.subject}
                className="mt-2.5 text-base leading-relaxed text-slate-800 dark:text-slate-200"
              >
                <MarkdownContent
                  text={currentQuestion.explanation_zh}
                  interactive
                  compact
                  glossary={activeQuiz.glossary}
                  source={questionSource}
                  subject={activeQuiz.subject}
                  vocabLookupMap={vocabLookupMap}
                  onWordClick={handleQuizWordClick}
                />
              </div>
            </div>
          )}

          {/* 底部控制栏 */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {currentQuestion.hint && !isAnswered && (
                <button
                  type="button"
                  onClick={handleRevealHint}
                  disabled={isHintVisible}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>{isHintVisible ? '已显示提示' : '提示 (Hint)'}</span>
                </button>
              )}

              {!isAnswered && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <SkipForward className="h-4 w-4" />
                  <span>跳过 (Skip)</span>
                </button>
              )}
            </div>

            {isAnswered && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <span>
                  {currentIndex + 1 < activeQuiz.questions.length ? '下一题' : '完成并查看成绩'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 视图 3：测验列表 ====================
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          测验模式
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          自动监听本地 quizzes/ 文件夹，AI 私教放入新测验 JSON 后会立即显示在此列表
        </p>
      </div>

      {/* 科目筛选分段按钮（仅当本地 Agent 写入测验后按实际科目动态显示） */}
      {availableSubjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setSubjectFilter('ALL')}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              subjectFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            全部科目
          </button>
          {availableSubjects.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSubjectFilter(subj)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                subjectFilter === subj
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      )}

      {/* 测验清单 */}
      {filteredQuizzes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C31]">
          <p className="text-base font-medium text-slate-800 dark:text-slate-200">
            {quizzes.length === 0 ? '暂无测验' : '当前科目下还没有测验'}
          </p>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            正在实时监听本地 <span className="font-mono">quizzes/</span> 目录，本地 Agent 写入测验 JSON 后会自动出现在这里。
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-[#131C31]">
          {filteredQuizzes.map((quiz) => {
            const latest = latestResultByQuizId.get(quiz.quiz_id);
            const glossaryCount = quiz.glossary ? Object.keys(quiz.glossary).length : 0;

            return (
              <div
                key={quiz.quiz_id}
                className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {quiz.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {quiz.subject}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{quiz.questions.length} 题</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">及格线 {quiz.pass_rate}%</span>
                    {glossaryCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">内置专业术语 {glossaryCount} 条</span>
                      </>
                    )}
                    {latest && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            latest.percent >= quiz.pass_rate
                              ? 'font-medium tabular-nums text-emerald-700 dark:text-emerald-400'
                              : 'font-medium tabular-nums text-amber-700 dark:text-amber-400'
                          }
                        >
                          上次成绩 {latest.score}/{latest.total} ({latest.percent}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startQuiz(quiz)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <span>开始测验</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
