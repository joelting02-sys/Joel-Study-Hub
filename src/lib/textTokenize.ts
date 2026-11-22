/**
 * 英文分词、标点/所有格清洗、原句提取与术语最长匹配引擎
 */

export interface TextSegment {
  type: 'glossary' | 'word' | 'separator';
  /** 展示的原始文本 */
  text: string;
  /** 如果是 glossary，记录匹配到的 glossary 原始键 */
  glossaryKey?: string;
  /** 在整段文本中的起始字符索引 */
  start: number;
  /** 在整段文本中的结束字符索引 */
  end: number;
}

/**
 * 去掉单词前后的标点和所有格：
 * - competitors' -> competitors
 * - company's / company’s -> company
 * - "hybrid," -> hybrid
 * - (suppliers) -> suppliers
 */
export function cleanToken(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  // 去掉首尾标点（保留内部连字符和撇号以便进一步处理所有格）
  s = s.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9'’]+$/g, '');
  // 去掉所有格 's 或 ’s
  s = s.replace(/['’]s$/i, '');
  // 去掉复数所有格末尾撇号 competitors' -> competitors
  s = s.replace(/['’]+$/g, '');
  // 再清理一次首尾残留非字母数字字符
  s = s.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
  return s;
}

/**
 * 判断字符是否属于英文单词字符
 */
function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9'’-]/.test(ch);
}

/**
 * 提取点击位置所在的完整英文原句
 */
export function extractSentenceAt(text: string, charIndex: number): string {
  if (!text) return '';
  const safeIdx = Math.max(0, Math.min(charIndex, text.length - 1));

  // 向前找句子开头（换行或句末标点 . ? ! 后跟空白）
  let start = 0;
  for (let i = safeIdx - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === '\n') {
      start = i + 1;
      break;
    }
    if ((ch === '.' || ch === '?' || ch === '!') && i + 1 < text.length && /\s/.test(text[i + 1])) {
      // 跳过常见缩写如 e.g. / i.e. / U.S. / Ch.5
      const prevTwo = text.slice(Math.max(0, i - 2), i + 1).toLowerCase();
      if (prevTwo === 'e.g' || prevTwo === 'i.e' || /\b[a-z]\.$/.test(text.slice(Math.max(0, i - 2), i + 1))) {
        continue;
      }
      start = i + 1;
      break;
    }
  }

  // 向后找句子结尾
  let end = text.length;
  for (let i = safeIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') {
      end = i;
      break;
    }
    if (ch === '.' || ch === '?' || ch === '!') {
      const nextCh = text[i + 1];
      if (!nextCh || /\s|["”’)\]]/.test(nextCh)) {
        end = i + 1;
        break;
      }
    }
  }

  return text.slice(start, end).trim().replace(/\s+/g, ' ');
}

/**
 * 将一段英文文本拆分为可点击的片段：
 * 1. 优先按 glossary 进行整组最长匹配（忽略大小写，要求词边界）
 * 2. 其余部分拆分为可点击的英文单词与非单词分隔符
 */
export function segmentEnglishText(
  text: string,
  glossary?: Record<string, string>,
): TextSegment[] {
  if (!text) return [];

  // 收集按长度降序排列的 glossary 词条（最长匹配优先）
  const glossaryKeys = glossary
    ? Object.keys(glossary)
        .filter((k) => k.trim().length > 0)
        .sort((a, b) => b.length - a.length)
    : [];

  // 找出所有不重叠的 glossary 匹配区间
  const matches: Array<{ start: number; end: number; key: string }> = [];
  if (glossaryKeys.length > 0) {
    const lowerText = text.toLowerCase();
    const occupied = new Uint8Array(text.length);

    for (const key of glossaryKeys) {
      const escaped = key
        .trim()
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+');
      // 允许词组末尾带轻微复数或所有格，但要求前后为非字母边界
      const regex = new RegExp(`(?<![A-Za-z0-9])${escaped}(?:['’]s|['’])?(?![A-Za-z0-9])`, 'g');
      let m: RegExpExecArray | null;
      while ((m = regex.exec(lowerText)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        let overlap = false;
        for (let i = start; i < end; i++) {
          if (occupied[i]) {
            overlap = true;
            break;
          }
        }
        if (!overlap) {
          for (let i = start; i < end; i++) {
            occupied[i] = 1;
          }
          matches.push({ start, end, key });
        }
      }
    }
    matches.sort((a, b) => a.start - b.start);
  }

  const segments: TextSegment[] = [];

  const pushPlainSlice = (sliceStart: number, sliceEnd: number) => {
    let i = sliceStart;
    while (i < sliceEnd) {
      // 匹配包含英文字母的 token（支持连字符、撇号，如 e-commerce, competitors', don't）
      if (/[A-Za-z]/.test(text[i])) {
        const tokenStart = i;
        i++;
        while (i < sliceEnd && isWordChar(text[i])) {
          i++;
        }
        // 去掉末尾纯连字符，防止 "cloud-" 把破折号吞进词里
        let tokenEnd = i;
        while (tokenEnd > tokenStart && text[tokenEnd - 1] === '-') {
          tokenEnd--;
        }
        const rawWord = text.slice(tokenStart, tokenEnd);
        if (cleanToken(rawWord).length > 0) {
          segments.push({
            type: 'word',
            text: rawWord,
            start: tokenStart,
            end: tokenEnd,
          });
        } else {
          segments.push({
            type: 'separator',
            text: rawWord,
            start: tokenStart,
            end: tokenEnd,
          });
        }
        if (tokenEnd < i) {
          segments.push({
            type: 'separator',
            text: text.slice(tokenEnd, i),
            start: tokenEnd,
            end: i,
          });
        }
      } else {
        const sepStart = i;
        i++;
        while (i < sliceEnd && !/[A-Za-z]/.test(text[i])) {
          i++;
        }
        segments.push({
          type: 'separator',
          text: text.slice(sepStart, i),
          start: sepStart,
          end: i,
        });
      }
    }
  };

  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      pushPlainSlice(cursor, match.start);
    }
    segments.push({
      type: 'glossary',
      text: text.slice(match.start, match.end),
      glossaryKey: match.key,
      start: match.start,
      end: match.end,
    });
    cursor = match.end;
  }

  if (cursor < text.length) {
    pushPlainSlice(cursor, text.length);
  }

  return segments;
}
