/**
 * 单词库页面
 * - 两个分页：「学习中」「已学会」，实时显示数量
 * - 支持顶部「快速查词 / 翻译入库」：输入任意英文单词或短语，自动调用离线词典 + 外部翻译模型接口并一键加入单词库
 * - 列表内点击单词或原句中的任意英文单词均可弹出点词翻译卡片
 * - 支持单条一键「模型翻译」更新释义、行内编辑中文、标记已学会、两步确认删除以及导出 exports/单词库.md
 */

import React, { useMemo, useState } from 'react';
import {
  Check,
  Languages,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  LookupResult,
  SubjectCode,
  VocabEntry,
  VocabStatus,
} from '../types/studyhub';
import { filterAndSortVocab } from '../lib/vocabLogic';
import { extractErrorMessage } from '../lib/errors';
import { InteractiveText, StudyWordButton, type WordClickPayload } from './InteractiveText';

interface VocabViewProps {
  words: VocabEntry[];
  vocabLookupMap: Map<string, VocabEntry>;
  translationConfigured: boolean;
  onWordClick: (payload: WordClickPayload) => void;
  onLookupAndTranslate: (payload: {
    surface: string;
    sentence?: string;
    subject?: string;
    preferApi?: boolean;
  }) => Promise<LookupResult>;
  onAddVocab: (payload: {
    word: string;
    meaning_zh: string;
    phonetic: string;
    pos: string;
    context: string;
    source: string;
    subject: string;
  }) => Promise<void>;
  onUpdateWord: (
    id: string,
    patch: { meaning_zh?: string; status?: VocabStatus; subject?: string },
  ) => Promise<void>;
  onDeleteWord: (id: string) => Promise<void>;
}

/**
 * 在英文原句中高亮目标单词，同时让整句里的每个英文单词都支持点击翻译
 */
function HighlightedInteractiveSentence({
  sentence,
  target,
  source,
  subject,
  vocabLookupMap,
  onWordClick,
}: {
  sentence: string;
  target: string;
  source: string;
  subject: string;
  vocabLookupMap: Map<string, VocabEntry>;
  onWordClick: (payload: WordClickPayload) => void;
}) {
  if (!sentence) {
    return <span className="text-slate-400 dark:text-slate-500">无原句记录</span>;
  }
  const escaped = target.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) {
    return (
      <InteractiveText
        text={sentence}
        source={source}
        subject={subject}
        vocabLookupMap={vocabLookupMap}
        onWordClick={onWordClick}
      />
    );
  }

  const regex = new RegExp(`(${escaped}(?:s|es|ed|ing|'s|’s|')?)`, 'gi');
  const parts = sentence.split(regex);

  return (
    <span className="whitespace-pre-line">
      {parts.map((part, idx) =>
        idx % 2 === 1 ? (
          <mark
            key={idx}
            className="rounded bg-blue-100 px-1 py-0.5 font-medium text-blue-900 dark:bg-blue-900/50 dark:text-blue-200"
          >
            <InteractiveText
              text={part}
              contextText={sentence}
              source={source}
              subject={subject}
              vocabLookupMap={vocabLookupMap}
              onWordClick={onWordClick}
            />
          </mark>
        ) : (
          <InteractiveText
            key={idx}
            text={part}
            contextText={sentence}
            source={source}
            subject={subject}
            vocabLookupMap={vocabLookupMap}
            onWordClick={onWordClick}
          />
        ),
      )}
    </span>
  );
}

export const VocabView: React.FC<VocabViewProps> = ({
  words,
  vocabLookupMap,
  translationConfigured,
  onWordClick,
  onLookupAndTranslate,
  onAddVocab,
  onUpdateWord,
  onDeleteWord,
}) => {
  const [activeTab, setActiveTab] = useState<VocabStatus>('learning');
  const [subject, setSubject] = useState<'ALL' | SubjectCode>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'added_desc' | 'lookup_desc'>('added_desc');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeaning, setEditingMeaning] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [translatingRowId, setTranslatingRowId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string>('');

  // 快速查词并入库
  const [quickWord, setQuickWord] = useState('');
  const [quickContext, setQuickContext] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickResult, setQuickResult] = useState<LookupResult | null>(null);
  const [quickManualMeaning, setQuickManualMeaning] = useState('');
  const [quickError, setQuickError] = useState('');
  const [quickSavedNotice, setQuickSavedNotice] = useState('');

  const learningCount = useMemo(
    () => words.filter((w) => w.status === 'learning').length,
    [words],
  );
  const learnedCount = useMemo(
    () => words.filter((w) => w.status === 'learned').length,
    [words],
  );
  const availableSubjects = useMemo(() => {
    const seen = new Set<string>();
    for (const w of words) {
      if (w.subject) seen.add(w.subject);
    }
    return Array.from(seen);
  }, [words]);

  const visibleWords = useMemo(
    () =>
      filterAndSortVocab(words, {
        status: activeTab,
        subject,
        search,
        sortBy,
      }),
    [words, activeTab, subject, search, sortBy],
  );

  const startEdit = (entry: VocabEntry) => {
    setEditingId(entry.id);
    setEditingMeaning(entry.meaning_zh);
    setConfirmDeleteId(null);
  };

  const saveEdit = async (id: string) => {
    await onUpdateWord(id, { meaning_zh: editingMeaning });
    setEditingId(null);
  };

  const handleRowTranslate = async (entry: VocabEntry) => {
    setTranslatingRowId(entry.id);
    setRowError('');
    try {
      const res = await onLookupAndTranslate({
        surface: entry.word,
        sentence: entry.context,
        subject: entry.subject,
        preferApi: true,
      });
      if (res.found && res.meaning_zh.trim()) {
        await onUpdateWord(entry.id, { meaning_zh: res.meaning_zh.trim() });
      } else {
        setRowError(`未查到「${entry.word}」的释义，请检查翻译接口配置或手动编辑。`);
      }
    } catch (err) {
      setRowError(extractErrorMessage(err, '翻译失败'));
    } finally {
      setTranslatingRowId(null);
    }
  };

  const handleQuickLookup = async (e: React.FormEvent, preferApi = false) => {
    e.preventDefault();
    const cleaned = quickWord.trim();
    if (!cleaned) return;
    setQuickLoading(true);
    setQuickError('');
    setQuickSavedNotice('');
    setQuickResult(null);
    setQuickManualMeaning('');
    try {
      const res = await onLookupAndTranslate({
        surface: cleaned,
        sentence: quickContext.trim(),
        subject: subject === 'ALL' ? '其他' : subject,
        preferApi,
      });
      setQuickResult(res);
      if (res.found) {
        setQuickManualMeaning(res.meaning_zh);
      }
    } catch (err) {
      setQuickError(extractErrorMessage(err, '查词翻译失败'));
    } finally {
      setQuickLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickResult) return;
    const finalMeaning = quickManualMeaning.trim() || quickResult.meaning_zh.trim();
    if (!finalMeaning) {
      setQuickError('请先输入或翻译出中文释义再加入单词库');
      return;
    }
    setQuickSaving(true);
    setQuickError('');
    try {
      await onAddVocab({
        word: quickResult.word,
        meaning_zh: finalMeaning,
        phonetic: quickResult.phonetic || '',
        pos: quickResult.pos || '',
        context: quickContext.trim(),
        source: '单词库快速查词',
        subject: subject === 'ALL' ? '其他' : subject,
      });
      setQuickSavedNotice(`已将「${quickResult.word}」加入单词库`);
      setQuickWord('');
      setQuickContext('');
      setQuickResult(null);
      setQuickManualMeaning('');
    } catch (err) {
      setQuickError(extractErrorMessage(err, '保存单词失败'));
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          单词库
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          鼠标指到或点击任意英文单词或原句词即可调用词典 / 翻译接口查义，修改实时写入 vocab.json
        </p>
      </div>

      {/* 快速查词 / 翻译模型一键入库 */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#131C31]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              快速查词翻译并加入单词库
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {translationConfigured
              ? '已接入外部翻译模型 API（未收录词自动调用）'
              : '当前使用离线词典（可在「设置」接入你的翻译模型 API）'}
          </span>
        </div>

        <form onSubmit={(e) => void handleQuickLookup(e, false)} className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            aria-label="输入英文单词或短语"
            value={quickWord}
            onChange={(e) => {
              setQuickWord(e.target.value);
              if (quickSavedNotice) setQuickSavedNotice('');
            }}
            placeholder="输入英文单词或词组，例如 amortization"
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            aria-label="可选原句语境"
            value={quickContext}
            onChange={(e) => setQuickContext(e.target.value)}
            placeholder="可选：粘贴所在英文原句（提升语境翻译准确度）"
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={quickLoading || !quickWord.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {quickLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>翻译中…</span>
              </>
            ) : (
              <>
                <Languages className="h-4 w-4" />
                <span>查询翻译</span>
              </>
            )}
          </button>
        </form>

        {quickResult && (
          <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-slate-50">
                  {quickResult.word}
                </span>
                {quickResult.phonetic && (
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    /{quickResult.phonetic}/
                  </span>
                )}
                {quickResult.pos && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {quickResult.pos}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  · {quickResult.source === 'api' ? '翻译接口' : quickResult.found ? '离线词典' : '未收录'}
                </span>
              </div>

              {translationConfigured && quickResult.source !== 'api' && (
                <button
                  type="button"
                  disabled={quickLoading}
                  onClick={(e) => void handleQuickLookup(e, true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <Languages className="h-3.5 w-3.5" />
                  <span>改用翻译模型重译</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                aria-label="确认或修改中文释义"
                value={quickManualMeaning}
                onChange={(e) => setQuickManualMeaning(e.target.value)}
                placeholder="输入或调整中文释义…"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                disabled={quickSaving || !quickManualMeaning.trim()}
                onClick={() => void handleQuickAdd()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Plus className="h-4 w-4" />
                <span>{quickSaving ? '保存中…' : '加入单词库'}</span>
              </button>
            </div>
          </div>
        )}

        {quickSavedNotice && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {quickSavedNotice}
          </p>
        )}
        {quickError && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {quickError}
          </p>
        )}
      </section>

      {rowError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <span>{rowError}</span>
          <button
            type="button"
            onClick={() => setRowError('')}
            aria-label="关闭错误提示"
            className="ml-3 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 分页 + 搜索 + 科目筛选 + 排序 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="单词状态分类"
          className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit dark:bg-slate-800/80"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'learning'}
            onClick={() => setActiveTab('learning')}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold tabular-nums transition-colors whitespace-nowrap ${
              activeTab === 'learning'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            学习中 ({learningCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'learned'}
            onClick={() => setActiveTab('learned')}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold tabular-nums transition-colors whitespace-nowrap ${
              activeTab === 'learned'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            已学会 ({learnedCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              aria-label="搜索单词或中文释义"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索单词、中文或原句…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {availableSubjects.length > 0 && (
            <select
              aria-label="按科目筛选"
              value={subject}
              onChange={(e) => setSubject(e.target.value as 'ALL' | SubjectCode)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="ALL">全部科目</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          <select
            aria-label="排序方式"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'added_desc' | 'lookup_desc')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="added_desc">按加入日期最新</option>
            <option value="lookup_desc">按查询次数最多</option>
          </select>
        </div>
      </div>

      {/* 单词列表 */}
      {visibleWords.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#131C31]">
          <p className="text-base font-medium text-slate-800 dark:text-slate-200">
            {activeTab === 'learning' ? '暂无「学习中」的单词' : '暂无「已学会」的单词'}
          </p>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            在测验中点击英文单词、使用上方快速查词，或由本地 Agent 写入 <span className="font-mono">vocab_inbox/</span> 即可加入单词库
          </p>
        </div>
      ) : (
        <div
          data-testid="vocab-list"
          className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-[#131C31]"
        >
          {visibleWords.map((item) => {
            const addedDate = item.added_at.slice(0, 10);
            const isEditing = editingId === item.id;
            const isConfirmingDelete = confirmDeleteId === item.id;
            const isTranslatingThis = translatingRowId === item.id;

            return (
              <div
                key={item.id}
                data-testid={`vocab-row-${item.word.toLowerCase()}`}
                className="flex flex-col gap-3 p-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  {/* 单词（支持悬停或点击弹出翻译卡片） + 音标 + 词性 */}
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <StudyWordButton
                      word={item.word}
                      dataStudyWord={item.word}
                      className="study-word cursor-pointer text-left text-lg font-bold text-slate-900 dark:text-slate-50"
                      onTrigger={(rect, trigger) =>
                        onWordClick({
                          surface: item.word,
                          sentence: item.context,
                          anchorRect: rect,
                          source: item.source || '单词库',
                          subject: item.subject,
                          trigger,
                        })
                      }
                    />
                    {item.phonetic && (
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        /{item.phonetic}/
                      </span>
                    )}
                    {item.pos && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {item.pos}
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        aria-label={`编辑 ${item.word} 的中文意思`}
                        value={editingMeaning}
                        onChange={(e) => setEditingMeaning(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveEdit(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full max-w-md rounded-lg border border-blue-400 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none dark:border-blue-500 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => void saveEdit(item.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <p className="text-base font-medium text-slate-800 dark:text-slate-100">
                      {item.meaning_zh || '（未填写中文释义）'}
                    </p>
                  )}

                  {/* 原句（目标词高亮 + 所有英文单词皆可点词翻译） */}
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <HighlightedInteractiveSentence
                      sentence={item.context}
                      target={item.word}
                      source={item.source || '单词库'}
                      subject={item.subject}
                      vocabLookupMap={vocabLookupMap}
                      onWordClick={onWordClick}
                    />
                  </p>

                  {/* 干净无胶囊元数据 */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.subject}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">加入 {addedDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                      查询 {item.lookup_count} 次
                    </span>
                    {item.source && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.source}</span>
                      </>
                    )}
                    {item.status === 'learning' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">下次复习 {item.review.next_review}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 行操作区 */}
                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-0.5">
                  {translationConfigured && (
                    <button
                      type="button"
                      disabled={isTranslatingThis}
                      aria-label={`用翻译接口翻译 ${item.word}`}
                      onClick={() => void handleRowTranslate(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    >
                      {isTranslatingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Languages className="h-3.5 w-3.5" />
                      )}
                      <span>{isTranslatingThis ? '翻译中…' : '模型翻译'}</span>
                    </button>
                  )}

                  {item.status === 'learning' ? (
                    <button
                      type="button"
                      aria-label={`标记 ${item.word} 已学会`}
                      onClick={() => void onUpdateWord(item.id, { status: 'learned' })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 whitespace-nowrap dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                    >
                      <Check className="h-4 w-4" />
                      <span>标记已学会</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`将 ${item.word} 改回学习中`}
                      onClick={() => void onUpdateWord(item.id, { status: 'learning' })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 whitespace-nowrap dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>改回学习中</span>
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label={`编辑 ${item.word} 的中文`}
                    onClick={() => startEdit(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>编辑</span>
                  </button>

                  {isConfirmingDelete ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`确认删除 ${item.word}`}
                        onClick={() => {
                          setConfirmDeleteId(null);
                          void onDeleteWord(item.id);
                        }}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 whitespace-nowrap"
                      >
                        确认删除
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`删除 ${item.word}`}
                      onClick={() => {
                        setConfirmDeleteId(item.id);
                        setEditingId(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:border-red-900 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>删除</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
