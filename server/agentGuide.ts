/**
 * 自动写入数据目录根目录的 AGENT_GUIDE.md 内容
 * 让外部 AI Agent 只要打开 StudyHub 数据目录就能直接读懂全部文件协议与读写规则
 */

export const AGENT_GUIDE_CONTENT = `# StudyHub — AI Agent Integration Guide

StudyHub is a local-first Windows desktop study client for Joel.
**You (the AI Agent) interact with StudyHub exclusively through local files in the StudyHub data directory.**
There is no login, no cloud database, and no HTTP API required on Windows. StudyHub watches this directory in real time (\`chokidar\`) and refreshes the UI automatically.

---

## 1. Data Directory Layout & Read/Write Rules

Default Windows path: \`C:\\Users\\<username>\\Documents\\StudyHub\\\` (or the custom path configured in StudyHub Settings).

| Path | Agent Permission | Purpose |
| --- | --- | --- |
| \`quizzes/*.json\` | **WRITE** | Put new quiz files here. StudyHub detects them live without restart. |
| \`vocab_inbox/*.json\` | **WRITE** | Suggest new vocabulary here. StudyHub deduplicates, merges into \`vocab.json\`, updates \`exports/单词库.md\`, and **automatically deletes** the inbox file. |
| \`vocab.json\` | **READ-ONLY** | Joel's vocabulary database. **NEVER write directly to \`vocab.json\`** (StudyHub is the sole writer). Read it to see \`learning\` vs \`learned\` words and high \`lookup_count\` weak spots. |
| \`results/*.json\` | **READ-ONLY** | Written automatically by StudyHub each time Joel finishes a quiz. Read these to analyze mistakes, skipped questions, hints used, and \`words_looked_up\`. |
| \`exports/单词库.md\` | **READ-ONLY** | Auto-generated Markdown table of \`vocab.json\`. |
| \`dict/\` | **OPTIONAL WRITE** | Optional offline ECDICT dictionary (\`ecdict.csv\` or \`*.json\`) for click-to-translate. |

### Safe Atomic Write Rule (Important)
When writing files into \`quizzes/\` or \`vocab_inbox/\`:
1. Write to a temporary filename containing \`.tmp.\` (e.g., \`quizzes/my-quiz.json.tmp.1\`). StudyHub ignores any file whose name contains \`.tmp.\`.
2. Rename/move the temporary file to the final \`.json\` filename (e.g., \`quizzes/my-quiz.json\`).

---

## 2. Schema: \`quizzes/<quiz_id>.json\` (Agent Writes)

Write UTF-8 JSON with the following structure:

\`\`\`json
{
  "quiz_id": "<unique-slug-id>",
  "title": "<display title>",
  "subject": "ICT | BE | ES | BO | 其他",
  "pass_rate": 80,
  "glossary": {
    "<english term or multi-word phrase>": "<concise Chinese translation>"
  },
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "stem": "<English question stem>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": 0,
      "explanation_zh": "<Chinese explanation shown after answering>",
      "hint": "<optional hint shown when Joel clicks Hint>",
      "source": "<optional textbook chapter or reference>"
    },
    {
      "id": "q2",
      "type": "true_false",
      "stem": "<English statement>",
      "options": ["True", "False"],
      "correct_index": 0,
      "explanation_zh": "<Chinese explanation>",
      "hint": "<optional hint>",
      "source": "<optional reference>"
    }
  ]
}
\`\`\`

### Field Rules
- \`subject\`: Must be one of \`"ICT"\`, \`"BE"\`, \`"ES"\`, \`"BO"\`, \`"其他"\` (other values automatically normalize to \`"其他"\`).
- \`pass_rate\`: Number 0–100 (defaults to \`80\` if omitted).
- \`glossary\`: Optional key-value map of domain phrases (lowercase recommended). StudyHub prioritizes \`glossary\` with **longest-phrase match first** when Joel clicks any word in the quiz.
- \`questions[].type\`: Only \`"multiple_choice"\` (4 options) or \`"true_false"\` (\`["True", "False"]\`).
- \`questions[].correct_index\`: 0-based integer index into \`options\`.

---

## 3. Schema: \`vocab_inbox/<batch_name>.json\` (Agent Writes)

Drop a JSON file into \`vocab_inbox/\` to recommend words/phrases for Joel's vocabulary library:

\`\`\`json
{
  "words": [
    {
      "word": "<word or phrase in base form>",
      "meaning_zh": "<concise Chinese meaning>",
      "phonetic": "<optional IPA>",
      "pos": "<optional part of speech, e.g. n. / v. / adj.>",
      "context": "<optional English sentence containing the word>",
      "source": "<optional source label>",
      "subject": "ICT | BE | ES | BO | 其他"
    }
  ]
}
\`\`\`

- Deduplication is case-insensitive on \`word\`: if the word already exists in \`vocab.json\`, it is skipped without overwriting Joel's status or review schedule.
- Newly merged words start with \`status: "learning"\`, \`lookup_count: 1\`, and \`review.interval_days: 1\`.
- StudyHub deletes the \`vocab_inbox/*.json\` file immediately after merging.

---

## 4. Schema: \`results/<quiz_id>_<YYYY-MM-DD_HH-mm-ss>.json\` (Agent Reads)

Generated automatically by StudyHub when Joel completes a quiz:

\`\`\`json
{
  "quiz_id": "<quiz_id>",
  "title": "<title>",
  "subject": "ICT | BE | ES | BO | 其他",
  "finished_at": "<ISO-8601 timestamp>",
  "score": 8,
  "total": 10,
  "percent": 80,
  "answers": [
    {
      "id": "q1",
      "chosen_index": 0,
      "correct": true,
      "used_hint": false
    }
  ],
  "words_looked_up": ["<words Joel clicked during this quiz>"]
}
\`\`\`

- \`chosen_index: -1\` means Joel skipped that question.
- \`words_looked_up\` lists unique words/phrases Joel clicked for translation during the quiz — ideal input for generating follow-up explanations or \`vocab_inbox\` entries.

---

## 5. Schema: \`vocab.json\` (Agent Reads Only)

\`\`\`json
{
  "version": 1,
  "words": [
    {
      "id": "<uuid>",
      "word": "<word or phrase>",
      "meaning_zh": "<Chinese meaning>",
      "phonetic": "<IPA>",
      "pos": "<part of speech>",
      "context": "<English sentence>",
      "source": "<source label>",
      "subject": "ICT | BE | ES | BO | 其他",
      "status": "learning | learned",
      "added_at": "<ISO-8601>",
      "learned_at": "<ISO-8601 | null>",
      "lookup_count": 1,
      "review": {
        "next_review": "YYYY-MM-DD",
        "interval_days": 1
      }
    }
  ]
}
\`\`\`

- \`lookup_count\` increments every time Joel clicks the same word again — high counts highlight words Joel repeatedly forgets.
- Only Joel manually marks words as \`"learned"\`; do not overwrite \`vocab.json\`.
`;
