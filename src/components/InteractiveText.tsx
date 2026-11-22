/**
 * 可点击查词的英文文本渲染组件
 * - 自动按 glossary 做最长词组匹配（整组高亮虚下划线）
 * - 每个英文单词均为独立可点击按钮，点击时调用 e.stopPropagation()
 *   （确保在测验选项内点词查翻译时，绝对不会误触发作答！）
 */

import React, { useMemo } from 'react';
import { cleanToken, extractSentenceAt, segmentEnglishText } from '../lib/textTokenize';
import { normalizeWordKey } from '../lib/vocabLogic';
import type { VocabEntry } from '../types/studyhub';

export interface WordClickPayload {
  surface: string;
  matchedGlossaryKey?: string;
  sentence: string;
  anchorRect: DOMRect;
  glossary?: Record<string, string>;
  source: string;
  subject: string;
}

interface InteractiveTextProps {
  text: string;
  glossary?: Record<string, string>;
  source: string;
  subject: string;
  vocabLookupMap?: Map<string, VocabEntry>;
  onWordClick: (payload: WordClickPayload) => void;
  className?: string;
}

export const InteractiveText: React.FC<InteractiveTextProps> = ({
  text,
  glossary,
  source,
  subject,
  vocabLookupMap,
  onWordClick,
  className = '',
}) => {
  const segments = useMemo(() => segmentEnglishText(text, glossary), [text, glossary]);

  const handleSegmentClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    surface: string,
    start: number,
    glossaryKey?: string,
  ) => {
    // 关键规则：阻止事件冒泡，防止在测验选项里点单词时触发作答
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const sentence = extractSentenceAt(text, start);
    onWordClick({
      surface,
      matchedGlossaryKey: glossaryKey,
      sentence,
      anchorRect: rect,
      glossary,
      source,
      subject,
    });
  };

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
          <button
            key={idx}
            type="button"
            data-study-word={seg.glossaryKey || seg.text}
            aria-label={`查询单词 ${seg.text}`}
            onClick={(e) => handleSegmentClick(e, seg.text, seg.start, seg.glossaryKey)}
            className={tokenClass}
          >
            {seg.text}
          </button>
        );
      })}
    </span>
  );
};
