import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafeExternalUrl,
  normalizeStudyMarkdown,
  parseStudyMarkdown,
} from './markdown.ts';

test('normalizeStudyMarkdown splits inline 1. 2. 3. 4. items onto separate lines', () => {
  const input =
    'Which of the following statements are true? 1. Cloud computing reduces CapEx. 2. SaaS runs locally. 3. ERP integrates business processes. 4. CRM manages customer relations.';
  const normalized = normalizeStudyMarkdown(input);
  const lines = normalized.split('\n');
  assert.equal(lines.length, 5);
  assert.equal(lines[0], 'Which of the following statements are true?');
  assert.match(lines[1], /^1\. Cloud computing/);
  assert.match(lines[2], /^2\. SaaS runs locally/);
  assert.match(lines[3], /^3\. ERP integrates/);
  assert.match(lines[4], /^4\. CRM manages/);

  const blocks = parseStudyMarkdown(input);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, 'paragraph');
  assert.equal(blocks[1].type, 'ordered_list');
  if (blocks[1].type === 'ordered_list') {
    assert.equal(blocks[1].items.length, 4);
    assert.equal(blocks[1].items[0].marker, '1.');
    assert.equal(blocks[1].items[3].marker, '4.');
  }
});

test('normalizeStudyMarkdown splits Chinese 1、2、3、4 and (1)(2)(3) inline sequences', () => {
  const cn = '以下说法正确的是：1、第一条 2、第二条 3、第三条 4、第四条';
  const cnBlocks = parseStudyMarkdown(cn);
  assert.equal(cnBlocks.length, 2);
  assert.equal(cnBlocks[1].type, 'ordered_list');
  if (cnBlocks[1].type === 'ordered_list') {
    assert.equal(cnBlocks[1].items.length, 4);
    assert.equal(cnBlocks[1].items[0].marker, '1、');
    assert.equal(cnBlocks[1].items[2].plainText, '第三条');
  }

  const paren = 'Choose: (1) Alpha (2) Beta (3) Gamma';
  const parenBlocks = parseStudyMarkdown(paren);
  assert.equal(parenBlocks.length, 2);
  assert.equal(parenBlocks[1].type, 'ordered_list');
  if (parenBlocks[1].type === 'ordered_list') {
    assert.equal(parenBlocks[1].items.length, 3);
    assert.equal(parenBlocks[1].items[1].marker, '(2)');
  }
});

test('normalizeStudyMarkdown does not falsely split decimals or version numbers', () => {
  const prose = 'In version 1.2 the growth rate rose from 1.5% to 2.4% in Q3.';
  assert.equal(normalizeStudyMarkdown(prose), prose);
  const blocks = parseStudyMarkdown(prose);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'paragraph');
});

test('parseStudyMarkdown parses headings, bold, inline code, tables, and fenced code blocks', () => {
  const md = [
    '### Key Concept',
    'An **ERP** system uses `SQL` queries.',
    '',
    '| Term | Meaning |',
    '| --- | --- |',
    '| **ERP** | Enterprise Resource Planning |',
    '',
    '```sql',
    'SELECT * FROM orders;',
    '```',
  ].join('\n');

  const blocks = parseStudyMarkdown(md);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'paragraph');
  assert.equal(blocks[2].type, 'table');
  assert.equal(blocks[3].type, 'code_block');
  if (blocks[3].type === 'code_block') {
    assert.equal(blocks[3].language, 'sql');
    assert.equal(blocks[3].code, 'SELECT * FROM orders;');
  }
});

test('isSafeExternalUrl blocks javascript: and data: links while allowing https:', () => {
  assert.equal(isSafeExternalUrl('https://example.com/docs'), true);
  assert.equal(isSafeExternalUrl('http://example.com'), true);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('data:text/html,<script>alert(1)</script>'), false);

  const blocks = parseStudyMarkdown('Click [bad](javascript:alert(1)) or [ok](https://example.com).');
  assert.equal(blocks[0].type, 'paragraph');
  if (blocks[0].type === 'paragraph') {
    const links = blocks[0].lines[0].inlines.filter((n) => n.type === 'link');
    assert.equal(links.length, 1);
    assert.equal(links[0].href, 'https://example.com');
  }
});

test('normalizeStudyMarkdown splits Step/步骤 sequences, A/B/C sub-items, and 【中文】 blocks cleanly', () => {
  const stepsText = '步骤 1：明确目标；步骤 2：收集数据；步骤 3：分析解读；步骤 4：采取行动';
  const stepBlocks = parseStudyMarkdown(stepsText);
  assert.equal(stepBlocks.length, 1);
  assert.equal(stepBlocks[0].type, 'ordered_list');
  if (stepBlocks[0].type === 'ordered_list') {
    assert.equal(stepBlocks[0].items.length, 4);
    assert.equal(stepBlocks[0].items[0].marker, '步骤 1：');
    assert.equal(stepBlocks[0].items[0].plainText, '明确目标');
    assert.equal(stepBlocks[0].items[3].plainText, '采取行动');
  }

  const abcOption =
    'A. First step; B. Second step; C. Third step\n【中文】A. 第一步；B. 第二步；C. 第三步';
  const abcBlocks = parseStudyMarkdown(abcOption);
  assert.equal(abcBlocks[0].type, 'ordered_list');
  assert.equal(abcBlocks[1].type, 'zh_label');
  assert.equal(abcBlocks[2].type, 'ordered_list');
  if (abcBlocks[0].type === 'ordered_list' && abcBlocks[2].type === 'ordered_list') {
    assert.equal(abcBlocks[0].items.length, 3);
    assert.equal(abcBlocks[0].items[0].plainText, 'First step');
    assert.equal(abcBlocks[2].items.length, 3);
    assert.equal(abcBlocks[2].items[1].plainText, '第二步');
  }
});

test('parseStudyMarkdown handles bold-italic ***text***, _italic_ without breaking snake_case, and escaped symbols', () => {
  const blocks = parseStudyMarkdown('Use ***key_term*** and _focus_ without breaking snake_case or \\*literal\\*.');
  assert.equal(blocks[0].type, 'paragraph');
  if (blocks[0].type === 'paragraph') {
    const inlines = blocks[0].lines[0].inlines;
    assert.equal(inlines.some((n) => n.type === 'strong'), true);
    assert.equal(inlines.some((n) => n.type === 'em'), true);
    assert.match(blocks[0].lines[0].plainText, /snake_case/);
    assert.match(blocks[0].lines[0].plainText, /\*literal\*/);
  }
});
