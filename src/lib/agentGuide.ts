/**
 * 自动生成给外部 AI Agent（AI 私教）阅读的 StudyHub 协议说明书
 * 每次初始化数据目录时会自动写入 <StudyHub数据目录>/AGENT_GUIDE.md
 */

export function buildAgentGuideMarkdown(dataDir: string): string {
  return `# StudyHub — AI Agent 协作协议指南

本目录是 **StudyHub** 本地桌面客户端的数据目录：\`${dataDir}\`。
外部 AI Agent（AI 私教）只需要按以下约定直接读写本地文件，客户端会通过文件监听实时生效，无需重启软件。

---

## 目录结构与读写权限

| 路径 | 写入者 | 用途说明 |
| --- | --- | --- |
| \`quizzes/*.json\` | **Agent 写入** / 客户端只读 | 放入新测验 JSON，客户端自动刷新到「测验」列表 |
| \`vocab_inbox/*.json\` | **Agent 写入** / 客户端合并后自动删除 | 推荐新单词，客户端自动去重合并进 \`vocab.json\`（状态 \`learning\`）并删除该 inbox 文件 |
| \`vocab.json\` | **仅客户端写入** / Agent 只读 | 用户完整单词库（含 \`status\`、\`lookup_count\`、复习进度）；**请勿直接改写此文件，新增单词请写到 \`vocab_inbox/\`** |
| \`results/*.json\` | **仅客户端写入** / Agent 只读 | 每次测验交卷后自动生成，记录得分、每题作答情况与 \`words_looked_up\` |
| \`exports/单词库.md\` | **仅客户端写入** / 外部只读 | 自动同步导出的 Markdown 表格（供 Obsidian / Anki 导入） |
| \`dict/\` | 用户或 Agent 放入 | 可选放入完整离线词典 \`ecdict.csv\`（skywind3000/ECDICT 格式） |

> **原子写入建议**：Agent 写文件时请先写临时文件（例如 \`xxx.json.tmp\`），写完后再重命名为 \`xxx.json\`，避免客户端读到半截文件。

---

## 1. 创建测验（写入 \`quizzes/<quiz_id>.json\`）

- \`subject\` 可选值：\`"ICT"\` | \`"BE"\` | \`"ES"\` | \`"BO"\` | \`"其他"\`
- \`type\` 仅支持：\`"multiple_choice"\`（4 个选项）或 \`"true_false"\`（\`options\` 为 \`["True", "False"]\`）
- \`glossary\` 非常重要：客户端点词翻译时会**最高优先级整组最长匹配** \`glossary\` 中的专业词组。

\`\`\`json
{
  "quiz_id": "unique-quiz-id",
  "title": "测验标题",
  "subject": "ICT",
  "pass_rate": 80,
  "glossary": {
    "multi word term": "专业术语中文释义"
  },
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "stem": "English question stem...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation_zh": "中文解析",
      "hint": "可选提示",
      "source": "可选出处，如 Ch5 · Section 2"
    }
  ]
}
\`\`\`

---

## 2. 推荐单词入库（写入 \`vocab_inbox/<任意名称>.json\`）

客户端检测到新文件后，会按 \`word\`（忽略大小写）去重，将尚未入库的词设为 \`status: "learning"\` 合并进 \`vocab.json\`，同步更新 \`exports/单词库.md\`，然后**自动删除该 inbox 文件**。

\`\`\`json
{
  "words": [
    {
      "word": "english term",
      "meaning_zh": "简短中文意思（建议不超过3个义项）",
      "phonetic": "",
      "pos": "n.",
      "context": "包含该词的完整英文原句",
      "source": "来源说明",
      "subject": "ICT"
    }
  ]
}
\`\`\`

---

## 3. 读取测验结果（读取 \`results/<quiz_id>_<时间>.json\`）

每次用户交卷后客户端自动写出：

\`\`\`json
{
  "quiz_id": "unique-quiz-id",
  "title": "测验标题",
  "subject": "ICT",
  "finished_at": "2026-11-22T10:00:00.000Z",
  "score": 8,
  "total": 10,
  "percent": 80,
  "answers": [
    { "id": "q1", "chosen_index": 1, "correct": false, "used_hint": true }
  ],
  "words_looked_up": ["term1", "term2"]
}
\`\`\`

Agent 可结合 \`results/*.json\` 中的错题和 \`words_looked_up\`，以及 \`vocab.json\` 中 \`lookup_count\` 较高的高频遗忘词，动态生成针对性的下一套测验写入 \`quizzes/\`。
`;
}
