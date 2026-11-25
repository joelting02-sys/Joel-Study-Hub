/**
 * StudyHub 安全 Markdown 解析器与题目排版规范化器
 * - 零 HTML 注入（不生成原始 HTML，只生成类型化 AST 供 React 安全渲染）
 * - 支持自动拆分连在一行的编号/步骤/字母分项条目：
 *   - 数字："1. ... 2. ..."、"1、... 2、..."、"(1) ... (2) ..."、"1) ... 2) ..."、"① ... ② ..."、"I. ... II. ..."
 *   - 步骤："步骤 1：... 步骤 2：..."、"第1步：... 第2步：..."、"Step 1: ... Step 2: ..."、"Stage 1: ..."、"Phase 1: ..."
 *   - 字母："A. ... B. ... C. ..."、"A) ... B) ... C) ..."、"(A) ... (B) ..."、"A、... B、..."、"A: ... B: ..."
 *   - 项目符号："• ... • ..."
 * - 支持标题、有序/无序列表、嵌套列表、代码块、引用块、GFM 表格、分隔线、行内加粗/斜体/粗斜体/删除线/行内代码/转义/安全链接
 * - 保留段落内的单个换行，并将【中文】/【中文提示】标签渲染为整洁的双语分隔标识
 */

export type MarkdownInline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: MarkdownInline[] }
  | { type: 'em'; children: MarkdownInline[] }
  | { type: 'del'; children: MarkdownInline[] }
  | { type: 'code'; code: string }
  | { type: 'link'; label: string; href: string };

export interface MarkdownLine {
  inlines: MarkdownInline[];
  plainText: string;
}

export interface MarkdownOrderedItem {
  marker: string;
  inlines: MarkdownInline[];
  plainText: string;
  children?: MarkdownBlock[];
}

export interface MarkdownUnorderedItem {
  inlines: MarkdownInline[];
  plainText: string;
  children?: MarkdownBlock[];
}

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; inlines: MarkdownInline[]; plainText: string }
  | { type: 'paragraph'; lines: MarkdownLine[] }
  | { type: 'ordered_list'; items: MarkdownOrderedItem[] }
  | { type: 'unordered_list'; items: MarkdownUnorderedItem[] }
  | { type: 'code_block'; language: string; code: string }
  | { type: 'blockquote'; blocks: MarkdownBlock[] }
  | { type: 'table'; headers: MarkdownLine[]; rows: MarkdownLine[][] }
  | { type: 'zh_label'; label: string }
  | { type: 'hr' };

const CIRCLED_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
const ROMAN_NUMS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/**
 * 校验外部链接 URL，仅允许 http: / https: 协议，阻断 javascript: / data: 等危险协议
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

interface InlineMarkerMatch {
  index: number;
  seqNum: number;
  markerText: string;
}

/**
 * 清理行内拆分后残留的末尾分隔符（如 "1) 需求；" -> "1) 需求"）
 */
function cleanSplitBoundary(segment: string, isLead: boolean): string {
  const trimmed = segment.trim();
  if (!trimmed) return '';
  if (isLead) {
    return trimmed.replace(/[;；,，、]+\s*$/, '').trim();
  }
  return trimmed.replace(/[;；,，、]+\s*$/, '').trim();
}

/**
 * 在单行中识别顺序递增的编号/步骤/字母分项序列，将其拆分为独立行
 */
function splitInlineSequentialList(line: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('|') || trimmed.startsWith('#') || trimmed.startsWith('>')) {
    return line;
  }

  // 多种常见题目编号/步骤/字母分项样式的检测器（按精确度排序）
  const strategies: Array<(s: string) => InlineMarkerMatch[]> = [
    // 步骤序列：步骤 1： / 步骤1. / 第1步： / Step 1: / Stage 1: / Phase 1:
    (s) => {
      const matches: InlineMarkerMatch[] = [];
      const re =
        /(?:^|(?<=[\s：:；;。！？!?，,]))(?:(?:\*\*|__)?(?:(?:步骤|Step|Stage|Phase)\s*(\d{1,2})|第\s*(\d{1,2})\s*步)\s*[.:：、]?(?:\*\*|__)?)(?=\s*[^\s])/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        const num = Number(m[1] || m[2]);
        if (num >= 1) {
          matches.push({ index: m.index, seqNum: num, markerText: m[0] });
        }
      }
      return matches;
    },
    // 1. / 2. / 3. （要求前面是行首或空白/标点，后面紧跟空白或中文，排除小数 1.5 与版本号 v1.2）
    (s) => {
      const matches: InlineMarkerMatch[] = [];
      const re = /(?:^|(?<=[\s：:；;。！？!?，,]))(\d{1,2})\.(?=\s+[^\s]|[\u4e00-\u9fff])/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        matches.push({ index: m.index, seqNum: Number(m[1]), markerText: `${m[1]}.` });
      }
      return matches;
    },
    // 1、 / 2、 / 3、
    (s) => {
      const matches: InlineMarkerMatch[] = [];
      const re = /(?:^|(?<=[\s：:；;。！？!?，,]))(\d{1,2})、/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        matches.push({ index: m.index, seqNum: Number(m[1]), markerText: `${m[1]}、` });
      }
      return matches;
    },
    // (1) / (2) 或 （1） / （2）
    (s) => {
      const matches: InlineMarkerMatch[] = [];
      const re = /(?:^|(?<=[\s：:；;。！？!?，,]))[（(](\d{1,2})[）)]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        matches.push({ index: m.index, seqNum: Number(m[1]), markerText: m[0] });
      }
      return matches;
    },
    // 1) / 2) / 3)
    (s) => {
      const matches: InlineMarkerMatch[] = [];
      const re = /(?:^|(?<=[\s：:；;。！？!?，,]))(\d{1,2})\)(?=\s*[^\s])/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        matches.push({ index: m.index, seqNum: Number(m[1]), markerText: `${m[1]})` });
      }
      return matches;
    },
    // ① / ② / ③
    (s) => {
      const matches: InlineMarkerMatch[] = [];
      const re = /[①②③④⑤⑥⑦⑧⑨⑩]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        const seqNum = CIRCLED_NUMS.indexOf(m[0]) + 1;
        if (seqNum > 0) {
          matches.push({ index: m.index, seqNum, markerText: m[0] });
        }
      }
      return matches;
    },
    // I. / II. / III. / IV.
    (s) => {
      const matches: InlineMarkerMatch[] = [];
      const re = /(?:^|(?<=[\s：:；;]))(I|II|III|IV|V|VI|VII|VIII|IX|X)\.(?=\s+[^\s])/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        const seqNum = ROMAN_NUMS.indexOf(m[1]) + 1;
        if (seqNum > 0) {
          matches.push({ index: m.index, seqNum, markerText: `${m[1]}.` });
        }
      }
      return matches;
    },
    // 字母分项：(A) ... (B) ... / A) ... B) ... / A. ... B. ... / A、... B、... / A：... B：...
    (s) => {
      const matches: InlineMarkerMatch[] = [];
      const re =
        /(?:^|(?<=[\s：:；;。！？!?，,]))(?:[（(]([A-H])[）)]|([A-H])(?:\.(?=\s+[^\s]|[\u4e00-\u9fff])|\)(?=\s*[^\s])|、(?=\s*[^\s])|[：:](?=\s+[^\s]|[\u4e00-\u9fff])))(?=\s*[^\s])/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        const letter = m[1] || m[2];
        if (!letter) continue;
        const seqNum = letter.charCodeAt(0) - 64; // A=1, B=2, ...
        matches.push({ index: m.index, seqNum, markerText: m[0] });
      }
      return matches;
    },
  ];

  for (const findMatches of strategies) {
    const rawMatches = findMatches(line);
    if (rawMatches.length < 2) continue;

    // 寻找以 1 (或 A) 开头、严格递增的最长有效序列
    const firstOneIdx = rawMatches.findIndex((m) => m.seqNum === 1);
    if (firstOneIdx === -1) continue;

    const seq: InlineMarkerMatch[] = [rawMatches[firstOneIdx]];
    let expected = 2;
    for (let i = firstOneIdx + 1; i < rawMatches.length; i++) {
      if (rawMatches[i].seqNum === expected) {
        seq.push(rawMatches[i]);
        expected++;
      }
    }

    if (seq.length < 2) continue;

    // 按序列切分，保持前导句独立成行，每条分项独占一行并清理末尾残留分号
    const parts: string[] = [];
    const lead = cleanSplitBoundary(line.slice(0, seq[0].index), true);
    if (lead) {
      parts.push(lead);
    }
    for (let i = 0; i < seq.length; i++) {
      const start = seq[i].index;
      const end = i + 1 < seq.length ? seq[i + 1].index : line.length;
      const rawItem = line.slice(start, end);
      const itemText = i + 1 < seq.length ? cleanSplitBoundary(rawItem, false) : rawItem.trim();
      if (itemText) {
        parts.push(itemText);
      }
    }
    return parts.join('\n');
  }

  // 若同一行包含多个 • 项目符号（如 "要点：• 第一条 • 第二条"），自动按行拆分
  const bulletSplitRe = /\s+(?=•\s*\S)/g;
  const bulletMatches = line.match(bulletSplitRe);
  if (bulletMatches && bulletMatches.length >= 1 && (trimmed.startsWith('•') || bulletMatches.length >= 2 || /[：:]\s*•/.test(line))) {
    return line
      .split(bulletSplitRe)
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n');
  }

  return line;
}

/**
 * 规范化题目与解析文本，使连在一行的编号/步骤/A-B-C 分项自动分行，并拆出【中文】标签行
 */
export function normalizeStudyMarkdown(raw: string): string {
  if (!raw) return '';
  const unified = raw.replace(/\r\n?/g, '\n');
  const lines = unified.split('\n');
  const out: string[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }
    if (inCodeFence) {
      out.push(line);
      continue;
    }

    const zhMatch = line.match(/^\s*(【(?:中文|中文提示)】)\s*(.*)$/);
    if (zhMatch) {
      out.push(zhMatch[1]);
      if (zhMatch[2]) {
        out.push(splitInlineSequentialList(zhMatch[2]));
      }
      continue;
    }

    out.push(splitInlineSequentialList(line));
  }

  return out.join('\n');
}

/**
 * 将内联 AST 展平为纯文本（用于点词翻译提取完整原句）
 */
export function inlinesToPlainText(inlines: MarkdownInline[]): string {
  let out = '';
  for (const node of inlines) {
    if (node.type === 'text') {
      out += node.text;
    } else if (node.type === 'code') {
      out += node.code;
    } else if (node.type === 'link') {
      out += node.label;
    } else {
      out += inlinesToPlainText(node.children);
    }
  }
  return out;
}

/**
 * 解析行内 Markdown：***bold-italic***, **bold**, __bold__, *italic*, _italic_, ~~del~~, `code`, [label](https://...), 反斜杠转义
 */
export function parseInlines(input: string): MarkdownInline[] {
  if (!input) return [];
  const nodes: MarkdownInline[] = [];
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      nodes.push({ type: 'text', text: buffer });
      buffer = '';
    }
  };

  let i = 0;
  while (i < input.length) {
    // 0. 反斜杠转义（\* \_ \` \[ \] \\ 等）
    if (input[i] === '\\' && i + 1 < input.length && /[*_~`[\]\\]/.test(input[i + 1])) {
      buffer += input[i + 1];
      i += 2;
      continue;
    }

    // 1. 行内代码 `code`
    if (input[i] === '`') {
      const end = input.indexOf('`', i + 1);
      if (end > i + 1) {
        flushBuffer();
        nodes.push({ type: 'code', code: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // 2. 链接 [label](url)
    if (input[i] === '[') {
      const closeBracket = input.indexOf(']', i + 1);
      if (closeBracket > i + 1 && input[closeBracket + 1] === '(') {
        const closeParen = input.indexOf(')', closeBracket + 2);
        if (closeParen > closeBracket + 2) {
          const label = input.slice(i + 1, closeBracket);
          const href = input.slice(closeBracket + 2, closeParen).trim();
          if (isSafeExternalUrl(href)) {
            flushBuffer();
            nodes.push({ type: 'link', label, href });
            i = closeParen + 1;
            continue;
          }
        }
      }
    }

    // 3. 粗斜体 ***text*** 或 ___text___
    if (
      (input[i] === '*' && input[i + 1] === '*' && input[i + 2] === '*') ||
      (input[i] === '_' && input[i + 1] === '_' && input[i + 2] === '_')
    ) {
      const delim = input.slice(i, i + 3);
      const end = input.indexOf(delim, i + 3);
      if (end > i + 3) {
        const inner = input.slice(i + 3, end);
        if (inner.trim().length > 0 && !/^\*+$/.test(inner)) {
          flushBuffer();
          nodes.push({
            type: 'strong',
            children: [{ type: 'em', children: parseInlines(inner) }],
          });
          i = end + 3;
          continue;
        }
      }
    }

    // 4. 加粗 **text** 或 __text__
    if (
      (input[i] === '*' && input[i + 1] === '*') ||
      (input[i] === '_' && input[i + 1] === '_')
    ) {
      const delim = input.slice(i, i + 2);
      const end = input.indexOf(delim, i + 2);
      if (end > i + 2) {
        const inner = input.slice(i + 2, end);
        if (inner.trim().length > 0 && !/^\*+$/.test(inner)) {
          flushBuffer();
          nodes.push({ type: 'strong', children: parseInlines(inner) });
          i = end + 2;
          continue;
        }
      }
    }

    // 5. 删除线 ~~text~~
    if (input[i] === '~' && input[i + 1] === '~') {
      const end = input.indexOf('~~', i + 2);
      if (end > i + 2) {
        const inner = input.slice(i + 2, end);
        if (inner.trim().length > 0) {
          flushBuffer();
          nodes.push({ type: 'del', children: parseInlines(inner) });
          i = end + 2;
          continue;
        }
      }
    }

    // 6. 斜体 *text*（避免误匹配带空格的乘号表达式）
    if (input[i] === '*' && input[i + 1] !== '*' && input[i + 1] !== ' ') {
      const end = input.indexOf('*', i + 1);
      if (end > i + 1 && input[end - 1] !== ' ') {
        const inner = input.slice(i + 1, end);
        flushBuffer();
        nodes.push({ type: 'em', children: parseInlines(inner) });
        i = end + 1;
        continue;
      }
    }

    // 7. 斜体 _text_（要求左右为词边界，避免 snake_case 被误拆）
    if (
      input[i] === '_' &&
      input[i + 1] !== '_' &&
      input[i + 1] !== ' ' &&
      (i === 0 || !/[A-Za-z0-9_]/.test(input[i - 1]))
    ) {
      const end = input.indexOf('_', i + 1);
      if (
        end > i + 1 &&
        input[end - 1] !== ' ' &&
        (end + 1 === input.length || !/[A-Za-z0-9_]/.test(input[end + 1]))
      ) {
        const inner = input.slice(i + 1, end);
        flushBuffer();
        nodes.push({ type: 'em', children: parseInlines(inner) });
        i = end + 1;
        continue;
      }
    }

    buffer += input[i];
    i++;
  }

  flushBuffer();
  return nodes;
}

function makeLine(raw: string): MarkdownLine {
  const inlines = parseInlines(raw);
  return { inlines, plainText: inlinesToPlainText(inlines) };
}

const ORDERED_LINE_RE =
  /^(\s*)((?:\d{1,2}[.)、])|(?:[（(]\d{1,2}[）)])|(?:[①②③④⑤⑥⑦⑧⑨⑩])|(?:(?:I|II|III|IV|V|VI|VII|VIII|IX|X)[.)])|(?:[A-H][.)、])|(?:[（(][A-H][）)])|(?:(?:步骤|Step|Stage|Phase)\s*\d{1,2}\s*[.:：、]?)|(?:第\s*\d{1,2}\s*步\s*[.:：、]?))\s*(.+)$/i;

const UNORDERED_LINE_RE = /^(\s*)(?:[-*+]\s+|•\s*)(.+)$/;

const HEADING_RE = /^(#{1,4})\s+(.+)$/;

const HR_RE = /^\s*(?:---+|\*\*\*+|___+)\s*$/;

const ZH_LABEL_RE = /^【(中文|中文提示)】$/;

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(trimmed);
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isBlockStart(lines: string[], idx: number): boolean {
  const line = lines[idx];
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^\s*```/.test(line)) return true;
  if (ZH_LABEL_RE.test(trimmed)) return true;
  if (HEADING_RE.test(trimmed)) return true;
  if (HR_RE.test(line)) return true;
  if (/^\s*>\s?/.test(line)) return true;
  if (ORDERED_LINE_RE.test(line)) return true;
  if (UNORDERED_LINE_RE.test(line)) return true;
  if (line.includes('|') && idx + 1 < lines.length && isTableSeparator(lines[idx + 1])) {
    return true;
  }
  return false;
}

function parseBlocks(lines: string[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 0. 双语分隔标签（【中文】 / 【中文提示】）
    const zhLabelMatch = trimmed.match(ZH_LABEL_RE);
    if (zhLabelMatch) {
      blocks.push({ type: 'zh_label', label: zhLabelMatch[1] });
      i++;
      continue;
    }

    // 1. 围栏代码块 ```lang
    const fenceMatch = rawLine.match(/^\s*```([A-Za-z0-9_+-]*)\s*$/);
    if (fenceMatch) {
      const language = fenceMatch[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // 跳过结束围栏
      blocks.push({ type: 'code_block', language, code: codeLines.join('\n') });
      continue;
    }

    // 2. 分隔线
    if (HR_RE.test(rawLine)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 3. 标题
    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      const level = Math.min(4, Math.max(1, headingMatch[1].length)) as 1 | 2 | 3 | 4;
      const lineObj = makeLine(headingMatch[2].trim());
      blocks.push({
        type: 'heading',
        level,
        inlines: lineObj.inlines,
        plainText: lineObj.plainText,
      });
      i++;
      continue;
    }

    // 4. 引用块 > ...
    if (/^\s*>\s?/.test(rawLine)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', blocks: parseBlocks(quoteLines) });
      continue;
    }

    // 5. GFM 表格
    if (rawLine.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableCells(rawLine).map(makeLine);
      i += 2;
      const rows: MarkdownLine[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        const cells = splitTableCells(lines[i]).map(makeLine);
        rows.push(cells);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // 6. 有序列表（支持 1. / 1、 / (1) / 1) / ① / I. / A. / A) / 步骤 1： / Step 1: 及缩进子列表）
    const orderedMatch = rawLine.match(ORDERED_LINE_RE);
    if (orderedMatch) {
      const baseIndent = orderedMatch[1].length;
      const items: MarkdownOrderedItem[] = [];

      while (i < lines.length) {
        const cur = lines[i];
        const m = cur.match(ORDERED_LINE_RE);
        if (!m || m[1].length !== baseIndent) break;

        const marker = m[2].trim();
        const contentLine = makeLine(m[3].trim());
        i++;

        // 收集缩进的子块
        const nestedLines: string[] = [];
        while (i < lines.length) {
          const next = lines[i];
          if (!next.trim()) {
            if (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1])) {
              nestedLines.push('');
              i++;
              continue;
            }
            break;
          }
          const leadingSpaces = next.match(/^(\s*)/)?.[1].length ?? 0;
          if (leadingSpaces > baseIndent) {
            nestedLines.push(next.slice(Math.min(leadingSpaces, baseIndent + 2)));
            i++;
          } else {
            break;
          }
        }

        items.push({
          marker,
          inlines: contentLine.inlines,
          plainText: contentLine.plainText,
          children: nestedLines.length > 0 ? parseBlocks(nestedLines) : undefined,
        });
      }

      blocks.push({ type: 'ordered_list', items });
      continue;
    }

    // 7. 无序列表（- / * / + / • 及缩进子列表）
    const unorderedMatch = rawLine.match(UNORDERED_LINE_RE);
    if (unorderedMatch) {
      const baseIndent = unorderedMatch[1].length;
      const items: MarkdownUnorderedItem[] = [];

      while (i < lines.length) {
        const cur = lines[i];
        const m = cur.match(UNORDERED_LINE_RE);
        if (!m || m[1].length !== baseIndent) break;

        const contentLine = makeLine(m[2].trim());
        i++;

        const nestedLines: string[] = [];
        while (i < lines.length) {
          const next = lines[i];
          if (!next.trim()) {
            if (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1])) {
              nestedLines.push('');
              i++;
              continue;
            }
            break;
          }
          const leadingSpaces = next.match(/^(\s*)/)?.[1].length ?? 0;
          if (leadingSpaces > baseIndent) {
            nestedLines.push(next.slice(Math.min(leadingSpaces, baseIndent + 2)));
            i++;
          } else {
            break;
          }
        }

        items.push({
          inlines: contentLine.inlines,
          plainText: contentLine.plainText,
          children: nestedLines.length > 0 ? parseBlocks(nestedLines) : undefined,
        });
      }

      blocks.push({ type: 'unordered_list', items });
      continue;
    }

    // 8. 普通段落（保留段落内的单个换行）
    const paraLines: MarkdownLine[] = [];
    while (i < lines.length && lines[i].trim() && (paraLines.length === 0 || !isBlockStart(lines, i))) {
      paraLines.push(makeLine(lines[i].trim()));
      i++;
    }
    blocks.push({ type: 'paragraph', lines: paraLines });
  }

  return blocks;
}

/**
 * 解析并规范化 StudyHub Markdown 文本为类型化 AST
 */
export function parseStudyMarkdown(raw: string): MarkdownBlock[] {
  const normalized = normalizeStudyMarkdown(raw);
  if (!normalized.trim()) return [];
  return parseBlocks(normalized.split('\n'));
}
