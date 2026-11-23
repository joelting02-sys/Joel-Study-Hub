/**
 * 单词库页面
 * - 两个分页：「学习中」「已学会」，实时显示数量
 * - 展示：单词、中文、原句（目标词高亮）、科目、加入日期、查询次数
 * - 操作：标记已学会 / 改回学习中、行内编辑中文、两步确认删除（不使用 window.confirm）
 * - 支持搜索、按科目筛选（ICT / BE / ES / BO / 其他）、按查询次数最多排序，以及导出 exports/单词库.md
 */

import React, { useMemo, useState } from 'react';
import {
  Check,
  Download,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { SubjectCode, VocabEntry, VocabStatus } from '../types/studyhub';
import { filterAndSortVocab } from '../lib/vocabLogic';

interface VocabViewProps {
  words: VocabEntry[];
  onUpdateWord: (
    id: string,
    patch: { meaning_zh?: string; status?: VocabStatus; subject?: string },
  ) => Promise<void>;
  onDeleteWord: (id: string) => Promise<void>;
  onExportMarkdown: () => Promise<{ markdown: string; path: string }>;
}

/**
 * 在英文原句中高亮目标单词或词组
 */
function HighlightedSentence({ sentence, target }: { sentence: string; target: string }) {
  if (!sentence) {
    return <span className="text-slate-400 dark:text-slate-500">无原句记录</span>;
  }
  const escaped = target.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return <span>{sentence}</span>;

  const regex = new RegExp(`(${escaped}(?:s|es|ed|ing|'s|’s|')?)`, 'gi');
  const parts = sentence.split(regex);

  return (
    <span>
      {parts.map((part, idx) =>
        idx % 2 === 1 ? (
          <mark
            key={idx}
            className="rounded bg-blue-100 px-1 py-0.5 font-medium text-blue-900 dark:bg-blue-900/50 dark:text-blue-200"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        ),
      )}
    </span>
  );
}

export const VocabView: React.FC<VocabViewProps> = ({
  words,
  onUpdateWord,
  onDeleteWord,
  onExportMarkdown,
}) => {
  const [activeTab, setActiveTab] = useState<VocabStatus>('learning');
  const [subject, setSubject] = useState<'ALL' | SubjectCode>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'added_desc' | 'lookup_desc'>('added_desc');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeaning, setEditingMeaning] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string>('');

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

  const handleDownloadMd = async () => {
    const res = await onExportMarkdown();
    setExportNotice(`已同步导出到 ${res.path}`);
    const blob = new Blob([res.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '单词库.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            单词库
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            所有修改实时原子写入 vocab.json，并自动同步导出 exports/单词库.md
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleDownloadMd()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          <span>导出 单词库.md</span>
        </button>
      </div>

      {exportNotice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="truncate">{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice('')}
            aria-label="关闭导出提示"
            className="ml-3 shrink-0 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
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
            在测验中点击英文单词，或由本地 Agent 写入 <span className="font-mono">vocab_inbox/</span> 即可自动加入单词库
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

            return (
              <div
                key={item.id}
                data-testid={`vocab-row-${item.word.toLowerCase()}`}
                className="flex flex-col gap-3 p-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  {/* 单词 + 音标 + 中文 */}
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                      {item.word}
                    </span>
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

                  {/* 原句（目标词高亮） */}
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <HighlightedSentence sentence={item.context} target={item.word} />
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
