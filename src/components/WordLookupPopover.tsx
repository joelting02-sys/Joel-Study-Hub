/**
 * 点词翻译弹出小卡片
 * - 显示单词原形 + 音标 + 词性 + 中文意思（最多 3 义项）
 * - 若已在单词库，显示「学习中」或「已学会」与「已在单词库 ✓」
 * - 若词典查无释义，显示「暂无释义」并支持手动输入中文意思后加入单词库
 * - 点击空白处或按 Esc 关闭
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { LookupResult, VocabEntry } from '../types/studyhub';

export interface ActiveLookupState {
  loading: boolean;
  result: LookupResult | null;
  sentence: string;
  source: string;
  subject: string;
  anchorRect: DOMRect;
}

interface WordLookupPopoverProps {
  lookup: ActiveLookupState | null;
  existingEntry: VocabEntry | null;
  onAddVocab: (payload: {
    word: string;
    meaning_zh: string;
    phonetic: string;
    pos: string;
    context: string;
    source: string;
    subject: string;
  }) => Promise<void>;
  onClose: () => void;
}

const SOURCE_LABELS: Record<LookupResult['source'], string> = {
  glossary: '本测验术语',
  acronym: '专业缩写',
  ecdict: '离线词典',
  not_found: '词典未收录',
};

export const WordLookupPopover: React.FC<WordLookupPopoverProps> = ({
  lookup,
  existingEntry,
  onAddVocab,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [manualMeaning, setManualMeaning] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setManualMeaning('');
    setErrorMsg('');
    setSaving(false);
  }, [lookup?.result?.word, lookup?.result?.surface]);

  // 自动计算卡片位置，确保不会超出屏幕边界
  useLayoutEffect(() => {
    if (!lookup) return;
    const cardWidth = 340;
    const cardHeight = cardRef.current?.offsetHeight || 220;
    const margin = 12;

    let left = lookup.anchorRect.left;
    if (left + cardWidth > window.innerWidth - margin) {
      left = window.innerWidth - cardWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // 默认放在单词正下方，如果下方空间不足则翻转到上方
    let top = lookup.anchorRect.bottom + 8;
    if (top + cardHeight > window.innerHeight - margin) {
      top = Math.max(margin, lookup.anchorRect.top - cardHeight - 8);
    }

    setPosition({ top, left });
  }, [lookup, lookup?.loading, lookup?.result]);

  // Esc 键关闭 + 点击卡片外空白处关闭
  useEffect(() => {
    if (!lookup) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (cardRef.current && cardRef.current.contains(target)) return;
      // 如果点击的是另一个英文单词，让该单词自己的 click 接管，不先闪关
      if (target.closest('[data-study-word]')) return;
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [lookup, onClose]);

  if (!lookup) return null;

  const { result, loading } = lookup;
  const effectiveMeaning = result?.found ? result.meaning_zh : manualMeaning.trim();

  const handleSave = async () => {
    if (!result) return;
    if (!result.found && !manualMeaning.trim()) {
      setErrorMsg('请先输入中文意思再加入单词库');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await onAddVocab({
        word: result.word,
        meaning_zh: effectiveMeaning,
        phonetic: result.phonetic || '',
        pos: result.pos || '',
        context: lookup.sentence,
        source: lookup.source,
        subject: lookup.subject,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="点词翻译卡片"
      data-testid="word-lookup-popover"
      style={{ top: `${position.top}px`, left: `${position.left}px`, width: '340px' }}
      className="fixed z-50 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#131C31] dark:shadow-black/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {loading || !result ? (
            <div className="text-base font-semibold text-slate-500 dark:text-slate-400">正在查询…</div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {result.word}
                </span>
                {result.phonetic && (
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    /{result.phonetic}/
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                {result.pos && <span className="font-medium text-slate-700 dark:text-slate-300">{result.pos}</span>}
                {result.pos && <span aria-hidden="true">·</span>}
                <span>{SOURCE_LABELS[result.source]}</span>
                {result.lemmaNote && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{result.lemmaNote}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="关闭翻译卡片"
          className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!loading && result && (
        <div className="mt-3">
          {result.found ? (
            <p className="text-base leading-relaxed font-medium text-slate-800 dark:text-slate-100">
              {result.meaning_zh}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                暂无释义（可手动输入中文意思保存）
              </p>
              <label className="block">
                <span className="sr-only">手动输入中文意思</span>
                <input
                  type="text"
                  value={manualMeaning}
                  onChange={(e) => {
                    setManualMeaning(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSave();
                    }
                  }}
                  placeholder="输入中文意思，例如：边际效用"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400"
                />
              </label>
            </div>
          )}

          {existingEntry && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
              <span
                className={
                  existingEntry.status === 'learned'
                    ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                    : 'font-semibold text-amber-700 dark:text-amber-400'
                }
              >
                状态：{existingEntry.status === 'learned' ? '已学会' : '学习中'}
              </span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                已查询 {existingEntry.lookup_count} 次
              </span>
            </div>
          )}

          {errorMsg && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="mt-3.5 flex items-center justify-between gap-2">
            {existingEntry ? (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 whitespace-nowrap dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              >
                <Check className="h-4 w-4" />
                <span>已在单词库 ✓</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                <span>{saving ? '保存中…' : '加入单词库'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
