/**
 * 可查词的英文文本渲染组件（支持鼠标悬停自动翻译与点击查词两种模式）
 * - 自动按 glossary 做最长词组匹配（整组高亮虚下划线）
 * - 每个英文单词均为独立按钮，点击时调用 e.stopPropagation()
 *   （确保在测验选项内查翻译时，不会误触发作答）
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { cleanToken, extractSentenceAt, segmentEnglishText } from '../lib/textTokenize';
import { normalizeWordKey } from '../lib/vocabLogic';
import type { VocabEntry, WordLookupTrigger } from '../types/studyhub';

const HOVER_OPEN_DELAY_MS = 140;

export interface WordLookupBehaviorContextValue {
  triggerMode: WordLookupTrigger;
  onHoverScheduleClose: () => void;
  onHoverCancelClose: () => void;
}

export const WordLookupBehaviorContext = createContext<WordLookupBehaviorContextValue>({
  triggerMode: 'hover',
  onHoverScheduleClose: () => {},
  onHoverCancelClose: () => {},
});

export interface WordClickPayload {
  surface: string;
  matchedGlossaryKey?: string;
  sentence: string;
  anchorRect: DOMRect;
  glossary?: Record<string, string>;
  source: string;
  subject: string;
  trigger?: WordLookupTrigger;
}

interface StudyWordButtonProps {
  word: string;
  dataStudyWord: string;
  className: string;
  onTrigger: (rect: DOMRect, trigger: WordLookupTrigger) => void;
}

export const StudyWordButton: React.FC<StudyWordButtonProps> = ({
  word,
  dataStudyWord,
  className,
  onTrigger,
}) => {
  const { triggerMode, onHoverScheduleClose, onHoverCancelClose } =
    useContext(WordLookupBehaviorContext);
  const hoverTimerRef = useRef<number | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (triggerMode !== 'hover') return;
    onHoverCancelClose();
    clearHoverTimer();
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null;
      onTrigger(rect, 'hover');
    }, HOVER_OPEN_DELAY_MS);
  };

  const handleMouseLeave = () => {
    clearHoverTimer();
    if (triggerMode === 'hover') {
      onHoverScheduleClose();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // 关键规则：阻止事件冒泡，防止在测验选项里点单词时触发作答
    e.stopPropagation();
    e.preventDefault();
    clearHoverTimer();
    onHoverCancelClose();
    onTrigger(e.currentTarget.getBoundingClientRect(), 'click');
  };

  return (
    <button
      type="button"
      data-study-word={dataStudyWord}
      aria-label={`查询单词 ${word}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={className}
    >
      {word}
    </button>
  );
};

interface InteractiveTextProps {
  text: string;
  /** 所在整句/整段的完整纯文本（用于 Markdown 加粗/斜体内部查词时仍能提取完整原句） */
  contextText?: string;
  glossary?: Record<string, string>;
  source: string;
  subject: string;
  vocabLookupMap?: Map<string, VocabEntry>;
  onWordClick: (payload: WordClickPayload) => void;
  className?: string;
}

export const InteractiveText: React.FC<InteractiveTextProps> = ({
  text,
  contextText,
  glossary,
  source,
  subject,
  vocabLookupMap,
  onWordClick,
  className = '',
}) => {
  const segments = useMemo(() => segmentEnglishText(text, glossary), [text, glossary]);

  const triggerSegment = useCallback(
    (
      rect: DOMRect,
      trigger: WordLookupTrigger,
      surface: string,
      start: number,
      glossaryKey?: string,
    ) => {
      let sentence: string;
      if (contextText && contextText.length >= text.length) {
        const fragmentPos = contextText.indexOf(text);
        const absoluteIdx =
          fragmentPos >= 0 ? fragmentPos + start : Math.max(0, contextText.indexOf(surface));
        sentence = extractSentenceAt(contextText, Math.max(0, absoluteIdx));
      } else {
        sentence = extractSentenceAt(text, start);
      }
      onWordClick({
        surface,
        matchedGlossaryKey: glossaryKey,
        sentence,
        anchorRect: rect,
        glossary,
        source,
        subject,
        trigger,
      });
    },
    [contextText, text, onWordClick, glossary, source, subject],
  );

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'separator') {
          return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
        }

        const keyToCheck = seg.glossaryKey
          ? normalizeWordKey(seg.glossaryKey)
          : normalizeWordKey(cleanToken(seg.text));
        const savedEntry = vocabLookupMap?.get(keyToCheck);
        const isLearning = savedEntry?.status === 'learning';

        const tokenClass = [
          'study-word inline cursor-pointer text-left font-inherit align-baseline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          seg.type === 'glossary' ? 'study-word-glossary' : '',
          isLearning ? 'study-word-saved' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <StudyWordButton
            key={idx}
            word={seg.text}
            dataStudyWord={seg.glossaryKey || seg.text}
            className={tokenClass}
            onTrigger={(rect, trigger) =>
              triggerSegment(rect, trigger, seg.text, seg.start, seg.glossaryKey)
            }
          />
        );
      })}
    </span>
  );
};
