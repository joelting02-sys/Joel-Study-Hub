/**
 * 安全 Markdown 排版渲染组件（支持嵌入可点击查词）
 * - 使用纯 React JSX 渲染 AST，零 dangerouslySetInnerHTML
 * - 自动将 1. / 2. / 3. / 4. 与 1、2、3、4 等条目按行整齐排版，带对齐编号与悬挂缩进
 * - 当 interactive=true 时，段落、列表、加粗、斜体、表格中的英文单词均可点击查词，且不破坏事件冒泡隔离
 */

import React, { useMemo } from 'react';
import {
  parseStudyMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
} from '../lib/markdown';
import type { VocabEntry } from '../types/studyhub';
import { InteractiveText, type WordClickPayload } from './InteractiveText';

interface MarkdownContentProps {
  text: string;
  interactive?: boolean;
  glossary?: Record<string, string>;
  source?: string;
  subject?: string;
  vocabLookupMap?: Map<string, VocabEntry>;
  onWordClick?: (payload: WordClickPayload) => void;
  /** 紧凑模式（用于选项行、提示条、解析等空间较紧的区域） */
  compact?: boolean;
  className?: string;
}

interface InlineRenderContext {
  interactive: boolean;
  glossary?: Record<string, string>;
  source: string;
  subject: string;
  vocabLookupMap?: Map<string, VocabEntry>;
  onWordClick?: (payload: WordClickPayload) => void;
  blockPlainText: string;
}

function renderInlines(inlines: MarkdownInline[], ctx: InlineRenderContext): React.ReactNode {
  return inlines.map((node, idx) => {
    switch (node.type) {
      case 'text':
        if (ctx.interactive && ctx.onWordClick) {
          return (
            <InteractiveText
              key={idx}
              text={node.text}
              contextText={ctx.blockPlainText}
              glossary={ctx.glossary}
              source={ctx.source}
              subject={ctx.subject}
              vocabLookupMap={ctx.vocabLookupMap}
              onWordClick={ctx.onWordClick}
            />
          );
        }
        return <React.Fragment key={idx}>{node.text}</React.Fragment>;

      case 'strong':
        return (
          <strong key={idx} className="font-semibold text-slate-950 dark:text-white">
            {renderInlines(node.children, ctx)}
          </strong>
        );

      case 'em':
        return (
          <em key={idx} className="italic">
            {renderInlines(node.children, ctx)}
          </em>
        );

      case 'del':
        return (
          <del key={idx} className="text-slate-400 line-through dark:text-slate-500">
            {renderInlines(node.children, ctx)}
          </del>
        );

      case 'code':
        return (
          <code
            key={idx}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.88em] text-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            {node.code}
          </code>
        );

      case 'link':
        return (
          <a
            key={idx}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 underline decoration-blue-400/70 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {node.label}
          </a>
        );

      default:
        return null;
    }
  });
}

function renderBlocks(
  blocks: MarkdownBlock[],
  baseCtx: Omit<InlineRenderContext, 'blockPlainText'>,
  compact: boolean,
): React.ReactNode {
  const listGap = compact ? 'space-y-1.5' : 'space-y-2';

  return blocks.map((block, idx) => {
    switch (block.type) {
      case 'heading': {
        const ctx: InlineRenderContext = { ...baseCtx, blockPlainText: block.plainText };
        const sizeClass =
          block.level === 1
            ? 'text-xl font-bold'
            : block.level === 2
              ? 'text-lg font-bold'
              : block.level === 3
                ? 'text-base font-semibold'
                : 'text-sm font-semibold';
        return (
          <div
            key={idx}
            role="heading"
            aria-level={Math.min(6, block.level + 2)}
            className={`${sizeClass} tracking-tight text-slate-900 dark:text-slate-50`}
          >
            {renderInlines(block.inlines, ctx)}
          </div>
        );
      }

      case 'paragraph': {
        const fullParagraphText = block.lines.map((l) => l.plainText).join(' ');
        return (
          <p key={idx} className="leading-[inherit]">
            {block.lines.map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {lineIdx > 0 && <br />}
                {renderInlines(line.inlines, {
                  ...baseCtx,
                  blockPlainText: line.plainText || fullParagraphText,
                })}
              </React.Fragment>
            ))}
          </p>
        );
      }

      case 'ordered_list':
        return (
          <ol key={idx} className={`${listGap} pl-0.5`}>
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-baseline gap-2.5">
                <span className="min-w-[1.6rem] shrink-0 text-right font-mono text-[0.9em] font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  {item.marker}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div>
                    {renderInlines(item.inlines, {
                      ...baseCtx,
                      blockPlainText: item.plainText,
                    })}
                  </div>
                  {item.children && item.children.length > 0 && (
                    <div className="space-y-1.5 pl-1">
                      {renderBlocks(item.children, baseCtx, true)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        );

      case 'unordered_list':
        return (
          <ul key={idx} className={`${listGap} pl-1`}>
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-baseline gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div>
                    {renderInlines(item.inlines, {
                      ...baseCtx,
                      blockPlainText: item.plainText,
                    })}
                  </div>
                  {item.children && item.children.length > 0 && (
                    <div className="space-y-1.5 pl-1">
                      {renderBlocks(item.children, baseCtx, true)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        );

      case 'code_block':
        return (
          <div
            key={idx}
            onClick={(e) => e.stopPropagation()}
            className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900 text-slate-100 dark:border-slate-700 dark:bg-[#0B1222]"
          >
            {block.language && (
              <div className="border-b border-slate-800 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                {block.language}
              </div>
            )}
            <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed sm:text-[13px]">
              <code>{block.code}</code>
            </pre>
          </div>
        );

      case 'blockquote':
        return (
          <blockquote
            key={idx}
            className="space-y-1.5 border-l-3 border-blue-500/60 bg-slate-50/70 py-1.5 pr-3 pl-3.5 text-slate-700 dark:border-blue-400/60 dark:bg-slate-900/40 dark:text-slate-300"
          >
            {renderBlocks(block.blocks, baseCtx, true)}
          </blockquote>
        );

      case 'table':
        return (
          <div
            key={idx}
            className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70">
                  {block.headers.map((header, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {renderInlines(header.inlines, {
                        ...baseCtx,
                        blockPlainText: header.plainText,
                      })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="bg-white dark:bg-transparent">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 text-slate-700 dark:text-slate-200"
                      >
                        {renderInlines(cell.inlines, {
                          ...baseCtx,
                          blockPlainText: cell.plainText,
                        })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'hr':
        return <hr key={idx} className="border-slate-200 dark:border-slate-700" />;

      default:
        return null;
    }
  });
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  text,
  interactive = false,
  glossary,
  source = '',
  subject = '其他',
  vocabLookupMap,
  onWordClick,
  compact = false,
  className = '',
}) => {
  const blocks = useMemo(() => parseStudyMarkdown(text), [text]);

  if (blocks.length === 0) return null;

  const baseCtx: Omit<InlineRenderContext, 'blockPlainText'> = {
    interactive,
    glossary,
    source,
    subject,
    vocabLookupMap,
    onWordClick,
  };

  return (
    <div
      data-testid="markdown-content"
      className={`${compact ? 'space-y-1.5' : 'space-y-2.5'} ${className}`.trim()}
    >
      {renderBlocks(blocks, baseCtx, compact)}
    </div>
  );
};
