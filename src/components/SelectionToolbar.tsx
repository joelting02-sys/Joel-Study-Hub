import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Languages, Play } from 'lucide-react';
import { speakWord } from '../lib/speech';
import type { SpeechAccent, SpeechEngine, SpeechRate } from '../types/studyhub';
import type { WordClickPayload } from './InteractiveText';

interface SelectionState {
  text: string;
  sentence: string;
  rect: DOMRect;
  source: string;
  subject: string;
}

interface SelectionToolbarProps {
  speechAccent: SpeechAccent;
  speechRate: SpeechRate;
  speechEngine: SpeechEngine;
  onTranslateSelection: (payload: WordClickPayload) => void;
}

const MULTI_WORD_ENGLISH_RE = /[A-Za-z]{2,}\s+[A-Za-z]{2,}/;

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  speechAccent,
  speechRate,
  speechEngine,
  onTranslateSelection,
}) => {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const readSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const rawText = sel.toString().replace(/\s+/g, ' ').trim();
    if (!rawText || rawText.length > 240 || !MULTI_WORD_ENGLISH_RE.test(rawText)) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const anchorNode = range.commonAncestorContainer;
    const anchorEl =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode.parentElement;

    if (!anchorEl) {
      setSelection(null);
      return;
    }

    if (
      anchorEl.closest('input, textarea, [data-testid="word-lookup-popover"], [data-study-selection-toolbar]')
    ) {
      return;
    }

    const container = anchorEl.closest('[data-study-selectable="true"]') as HTMLElement | null;
    if (!container) {
      setSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSelection(null);
      return;
    }

    const source = container.getAttribute('data-study-source') || '划词翻译';
    const subject = container.getAttribute('data-study-subject') || '其他';
    const containerText = (container.textContent || rawText).replace(/\s+/g, ' ').trim();
    const sentence = containerText.slice(0, 500);

    setSelection({
      text: rawText,
      sentence,
      rect,
      source,
      subject,
    });
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      window.setTimeout(readSelection, 10);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelection(null);
        return;
      }
      if (e.shiftKey) {
        window.setTimeout(readSelection, 10);
      }
    };
    const handleScroll = () => {
      setSelection(null);
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && toolbarRef.current?.contains(target)) return;
      setSelection(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [readSelection]);

  if (!selection) return null;

  const top = Math.max(8, selection.rect.top - 42);
  const left = Math.min(
    Math.max(12, selection.rect.left + selection.rect.width / 2 - 64),
    window.innerWidth - 144,
  );

  return (
    <div
      ref={toolbarRef}
      data-study-selection-toolbar="true"
      style={{ top: `${top}px`, left: `${left}px` }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-lg shadow-slate-900/15 dark:border-slate-700 dark:bg-[#131C31] dark:shadow-black/50"
    >
      <button
        type="button"
        onClick={() => {
          void speakWord(selection.text, {
            accent: speechAccent,
            rate: speechRate,
            engine: speechEngine,
          });
        }}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-950/60 dark:hover:text-blue-300"
      >
        <Play className="h-3 w-3 fill-current" />
        <span>读</span>
      </button>
      <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
      <button
        type="button"
        onClick={() => {
          const payload: WordClickPayload = {
            surface: selection.text,
            sentence: selection.sentence,
            anchorRect: selection.rect,
            source: selection.source,
            subject: selection.subject,
            trigger: 'click',
          };
          setSelection(null);
          window.getSelection()?.removeAllRanges();
          onTranslateSelection(payload);
        }}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60"
      >
        <Languages className="h-3.5 w-3.5" />
        <span>译</span>
      </button>
    </div>
  );
};
