/**
 * 点词翻译弹出小卡片
 * - 显示单词原形 + 音标 + 词性 + 中文意思
 * - 支持离线词典（glossary / 缩写 / ECDICT）与外部翻译模型 API 接口无缝衔接
 * - 支持一键调用翻译接口翻译 / 重译，并一键加入单词库或更新已有释义
 * - 点击空白处或按 Esc 关闭
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Languages, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import type {
  LookupResult,
  SpeechAccent,
  SpeechEngine,
  SpeechRate,
  VocabAiCache,
  VocabEntry,
} from '../types/studyhub';
import { extractErrorMessage } from '../lib/errors';
import { formatPhoneticDisplay, isDedicatedTranslationModel } from '../lib/lookupHelpers';
import { vocabAiCacheFromLookup } from '../lib/translationCache';
import { WordSpeakButton } from './WordSpeakButton';

export interface ActiveLookupState {
  loading: boolean;
  translatingApi?: boolean;
  apiError?: string;
  autoSaved?: boolean;
  openedBy?: 'hover' | 'click';
  triggerKey?: string;
  result: LookupResult | null;
  sentence: string;
  source: string;
  subject: string;
  anchorRect: DOMRect;
}

interface WordLookupPopoverProps {
  lookup: ActiveLookupState | null;
  existingEntry: VocabEntry | null;
  translationConfigured: boolean;
  translationModel?: string;
  speechAccent: SpeechAccent;
  speechRate: SpeechRate;
  speechEngine: SpeechEngine;
  onToggleAccent: () => void;
  onRequestApiTranslate: () => Promise<void>;
  onSelectSynonym?: (word: string) => void;
  onAddVocab: (payload: {
    word: string;
    meaning_zh: string;
    phonetic: string;
    pos: string;
    context: string;
    source: string;
    subject: string;
    ai_cache?: VocabAiCache;
  }) => Promise<void>;
  onUpdateExistingMeaning: (id: string, meaningZh: string) => Promise<void>;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const SOURCE_LABELS: Record<LookupResult['source'], string> = {
  glossary: '本测验术语',
  acronym: '专业缩写',
  ecdict: '离线词典',
  api: '翻译接口',
  not_found: '词典未收录',
};

export const WordLookupPopover: React.FC<WordLookupPopoverProps> = ({
  lookup,
  existingEntry,
  translationConfigured,
  translationModel = '',
  speechAccent,
  speechRate,
  speechEngine,
  onToggleAccent,
  onRequestApiTranslate,
  onSelectSynonym,
  onAddVocab,
  onUpdateExistingMeaning,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [manualMeaning, setManualMeaning] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingMeaning, setUpdatingMeaning] = useState(false);
  const [updatedNotice, setUpdatedNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setManualMeaning('');
    setErrorMsg('');
    setSaving(false);
    setUpdatingMeaning(false);
    setUpdatedNotice(false);
  }, [lookup?.result?.word, lookup?.result?.surface]);

  // 自动计算卡片位置，确保不会超出屏幕边界
  useLayoutEffect(() => {
    if (!lookup) return;
    const cardWidth = 360;
    const cardHeight = cardRef.current?.offsetHeight || 240;
    const margin = 12;

    let left = lookup.anchorRect.left;
    if (left + cardWidth > window.innerWidth - margin) {
      left = window.innerWidth - cardWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // 默认放在单词正下方，如果下方空间不足则翻转到上方
    let top = lookup.anchorRect.bottom + 6;
    if (top + cardHeight > window.innerHeight - margin) {
      top = Math.max(margin, lookup.anchorRect.top - cardHeight - 6);
    }

    setPosition({ top, left });
  }, [lookup, lookup?.loading, lookup?.translatingApi, lookup?.result, lookup?.apiError]);

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

  const { result, loading, translatingApi, apiError, autoSaved } = lookup;
  const effectiveMeaning = result?.found ? result.meaning_zh : manualMeaning.trim();
  const canUpdateExistingMeaning = Boolean(
    existingEntry &&
      result?.found &&
      result.meaning_zh.trim() &&
      result.meaning_zh.trim() !== existingEntry.meaning_zh.trim(),
  );

  const handleSave = async () => {
    if (!result || existingEntry) return;
    if (!result.found && !manualMeaning.trim()) {
      setErrorMsg('请先输入中文意思，或点击「调用翻译接口」');
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
        context: lookup.sentence || result.example_en || '',
        source: lookup.source,
        subject: lookup.subject,
        ...(result.source === 'api'
          ? { ai_cache: vocabAiCacheFromLookup(result, translationModel) }
          : {}),
      });
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleSyncMeaning = async () => {
    if (!existingEntry || !result?.meaning_zh.trim()) return;
    setUpdatingMeaning(true);
    setErrorMsg('');
    try {
      await onUpdateExistingMeaning(existingEntry.id, result.meaning_zh.trim());
      setUpdatedNotice(true);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, '更新释义失败'));
    } finally {
      setUpdatingMeaning(false);
    }
  };

  const handleCardMouseLeave = () => {
    const active = document.activeElement;
    if (active && active.tagName === 'INPUT' && cardRef.current?.contains(active)) {
      return;
    }
    onMouseLeave?.();
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="查词翻译卡片"
      data-testid="word-lookup-popover"
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleCardMouseLeave}
      style={{ top: `${position.top}px`, left: `${position.left}px`, width: '360px' }}
      className="fixed z-50 max-w-[calc(100vw-24px)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#131C31] dark:shadow-black/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {loading || !result ? (
            <div className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span>正在查询…</span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {result.word}
                </span>
                <WordSpeakButton
                  text={result.word}
                  accent={speechAccent}
                  rate={speechRate}
                  engine={speechEngine}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAccent();
                  }}
                  title="切换美音 / 英音（仅切换，不自动播放）"
                  className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-300"
                >
                  {speechAccent === 'en-GB' ? '英' : '美'}
                </button>
                {formatPhoneticDisplay(result.phonetic) && (
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatPhoneticDisplay(result.phonetic)}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                {result.pos && (
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {result.pos}
                  </span>
                )}
                {result.pos && <span aria-hidden="true">·</span>}
                <span
                  className={
                    result.source === 'api'
                      ? 'font-semibold text-blue-600 dark:text-blue-400'
                      : ''
                  }
                >
                  {SOURCE_LABELS[result.source]}
                </span>
                {result.lemmaNote && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{result.lemmaNote}</span>
                  </>
                )}
              </div>
              {result.correctedFrom && (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  已纠错：{result.correctedFrom} → {result.word}
                </p>
              )}
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
          {translatingApi && !result.found ? (
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span>正在调用翻译模型接口…</span>
            </div>
          ) : result.found ? (
            <div className="space-y-2.5">
              {result.context_zh && (
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-sm leading-snug text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-200">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    本句意思：
                  </span>
                  <span className="font-medium">{result.context_zh}</span>
                </div>
              )}

              <p className="text-base leading-relaxed font-medium text-slate-800 dark:text-slate-100">
                {result.meaning_zh}
              </p>

              {translatingApi && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  <span>正在补充通俗说法与同义词…</span>
                </div>
              )}

              {result.glossaryNote && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  本测验术语：{result.glossaryNote}
                </p>
              )}

              {result.plain_zh && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 py-2 text-xs leading-relaxed text-slate-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-slate-200">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">通俗说法：</span>
                  <span>{result.plain_zh}</span>
                </div>
              )}

              {result.alternatives && result.alternatives.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    不同说法：
                  </span>
                  {result.alternatives.map((alt, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              )}

              {result.synonyms && result.synonyms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    英文同义词：
                  </span>
                  {result.synonyms.map((syn, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSynonym?.(syn);
                      }}
                      title={`点击查询 ${syn}`}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:border-blue-600 dark:hover:bg-blue-950/40"
                    >
                      {syn}
                    </button>
                  ))}
                </div>
              )}

              {result.source === 'api' &&
                isDedicatedTranslationModel(translationModel) &&
                !result.plain_zh &&
                (!result.alternatives || result.alternatives.length === 0) &&
                (!result.synonyms || result.synonyms.length === 0) && (
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                    当前为纯直译模型（只出单一译文）；在设置改选通用对话模型可自动展示通俗说法与同义词。
                  </p>
                )}
            </div>
          ) : (
            <div className="space-y-2">
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <span>你是不是想查：</span>
                  {result.suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSynonym?.(sug);
                      }}
                      className="rounded-md border border-amber-300 bg-white px-2 py-0.5 font-mono font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {translationConfigured
                  ? '离线词典未收录，可点击下方按钮调用翻译接口，或手动输入中文释义。'
                  : '离线词典未收录。可在「设置 → 翻译模型 API 接口」接入你的翻译模型，或直接手动输入中文保存。'}
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

          {apiError && (
            <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400" role="alert">
              翻译接口提示：{apiError}
            </p>
          )}

          {autoSaved && (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              已通过翻译接口自动加入单词库 ✓
            </p>
          )}

          {updatedNotice && (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              已同步更新单词库释义 ✓
            </p>
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

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {/* 手动触发或使用翻译模型按语境重译 */}
            {translationConfigured && !translatingApi && (
              <button
                type="button"
                onClick={() => void onRequestApiTranslate()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {result.source === 'api' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>重译</span>
                  </>
                ) : (
                  <>
                    <Languages className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>AI 更多意思 / 同义</span>
                  </>
                )}
              </button>
            )}

            {existingEntry ? (
              canUpdateExistingMeaning ? (
                <button
                  type="button"
                  onClick={() => void handleSyncMeaning()}
                  disabled={updatingMeaning}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Check className="h-4 w-4" />
                  <span>{updatingMeaning ? '更新中…' : '更新词库释义'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex flex-1 cursor-default items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 whitespace-nowrap dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    已在单词库（{existingEntry.status === 'learned' ? '已学会' : '学习中'}）✓
                  </span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || translatingApi}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
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
