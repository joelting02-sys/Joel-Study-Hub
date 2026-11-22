/**
 * 阅读模式页面
 * - 支持直接粘贴英文材料或打开本地 .txt / .md 文件（无预设示例文章）
 * - 每个英文单词都可点词翻译、加入单词库（自动记录原句、科目和来源文件名）
 */

import React, { useRef, useState } from 'react';
import { BookOpen, Edit3, Trash2, Upload } from 'lucide-react';
import type { FontScale, SubjectCode, VocabEntry } from '../types/studyhub';
import { SUBJECT_OPTIONS } from '../types/studyhub';
import { InteractiveText, type WordClickPayload } from './InteractiveText';

interface ReadingViewProps {
  vocabLookupMap: Map<string, VocabEntry>;
  fontScale: FontScale;
  onWordClick: (payload: WordClickPayload) => void;
}

const READING_SIZE_CLASS: Record<FontScale, string> = {
  normal: 'text-[17px] leading-[1.85]',
  large: 'text-[19px] leading-[1.9]',
  xlarge: 'text-[21px] leading-[1.95]',
};

export const ReadingView: React.FC<ReadingViewProps> = ({
  vocabLookupMap,
  fontScale,
  onWordClick,
}) => {
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [subject, setSubject] = useState<SubjectCode>('ICT');
  const [mode, setMode] = useState<'read' | 'edit'>('edit');
  const [draftText, setDraftText] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setContent(text);
    setDraftText(text);
    setSource(file.name);
    setMode('read');
  };

  const handleApplyPastedText = () => {
    if (!draftText.trim()) return;
    setContent(draftText);
    if (!source.trim()) {
      setSource('粘贴的文本');
    }
    setMode('read');
  };

  const handleClear = () => {
    setContent('');
    setDraftText('');
    setSource('');
    setMode('edit');
  };

  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            阅读模式
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            粘贴英文段落或打开 .txt / .md 讲义，点击任意单词即时查词并存入单词库
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => void handleOpenFile(e)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            <span>打开 .txt / .md</span>
          </button>

          {content && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Trash2 className="h-4 w-4" />
              <span>清空</span>
            </button>
          )}

          <button
            type="button"
            disabled={mode === 'edit' && !draftText.trim()}
            onClick={() => {
              if (mode === 'read') {
                setDraftText(content);
                setMode('edit');
              } else {
                handleApplyPastedText();
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {mode === 'read' ? (
              <>
                <Edit3 className="h-4 w-4" />
                <span>编辑文本</span>
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" />
                <span>开始阅读查词</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 科目与来源设置栏 */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-[#131C31]">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="whitespace-nowrap">科目</span>
          <select
            aria-label="阅读材料科目"
            value={subject}
            onChange={(e) => setSubject(e.target.value as SubjectCode)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="whitespace-nowrap">来源</span>
          <input
            type="text"
            aria-label="阅读材料来源"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="例如：讲义文件名或章节（选填）"
            className="w-64 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>

      {/* 主区域：粘贴编辑 或 阅读查词 */}
      {mode === 'edit' ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              粘贴英文学习材料（支持多段落），或点击右上角「打开 .txt / .md」
            </span>
            <textarea
              rows={12}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="在此粘贴英文讲义、论文或案例分析..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-4 text-base leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <div className="flex items-center justify-end gap-3">
            {content && (
              <button
                type="button"
                onClick={() => setMode('read')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                返回阅读
              </button>
            )}
            <button
              type="button"
              disabled={!draftText.trim()}
              onClick={handleApplyPastedText}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              确认并进入点词阅读
            </button>
          </div>
        </div>
      ) : (
        <article
          data-testid="reading-article"
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#131C31]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>{source || '粘贴的文本'} · 科目 {subject}</span>
            <span>点击任意英文单词查看释义并加入单词库</span>
          </div>

          <div className={`space-y-5 text-slate-800 dark:text-slate-100 ${READING_SIZE_CLASS[fontScale]}`}>
            {paragraphs.map((para, idx) => (
              <p key={idx}>
                <InteractiveText
                  text={para}
                  source={source.trim() || '粘贴的文本'}
                  subject={subject}
                  vocabLookupMap={vocabLookupMap}
                  onWordClick={onWordClick}
                />
              </p>
            ))}
          </div>
        </article>
      )}
    </div>
  );
};
