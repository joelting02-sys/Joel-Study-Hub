# Joel Study Hub — AI Agent Integration Guide

Joel Study Hub is a blank, local-first Windows desktop study client designed to be populated directly by your local AI Agent.
**You (the AI Agent) interact with Joel Study Hub exclusively through local files in the data directory.**
There is no preset content, no login, no cloud database, and no HTTP API required on Windows. The app watches this directory in real time (`chokidar`) and refreshes the UI automatically.

---

## 1. Data Directory Layout & Read/Write Rules

Default Windows path: `C:\Users\<username>\Documents\StudyHub\` (or the custom path saved in `studyhub-config.json` / `STUDYHUB_DATA_DIR`).

| Path | Agent Permission | Purpose |
| --- | --- | --- |
| `quizzes/*.json` | **WRITE** | Put new quiz files here. StudyHub detects them live without restart. |
| `vocab_inbox/*.json` | **WRITE** | Suggest new vocabulary here. StudyHub deduplicates, merges into `vocab.json`, updates `exports/单词库.md`, and **automatically deletes** the inbox file. |
| `vocab.json` | **READ-ONLY** | Joel's vocabulary database. **NEVER write directly to `vocab.json`** (StudyHub is the sole writer). Read it to see `learning` vs `learned` words and high `lookup_count` weak spots. |
| `results/*.json` | **READ-ONLY** | Written automatically by StudyHub each time Joel finishes a quiz. Read these to analyze mistakes, skipped questions, hints used, and `words_looked_up`. |
| `exports/单词库.md` | **READ-ONLY** | Auto-generated Markdown table of `vocab.json`. |
| `dict/` | **OPTIONAL WRITE** | Optional offline ECDICT dictionary (`ecdict.csv` or `*.json`) for click-to-translate. |

### Safe Atomic Write Rule (Important)
When writing files into `quizzes/` or `vocab_inbox/`:
1. Write to a temporary filename containing `.tmp.` (e.g., `quizzes/my-quiz.json.tmp.1`). StudyHub ignores any file whose name contains `.tmp.`.
2. Rename/move the temporary file to the final `.json` filename (e.g., `quizzes/my-quiz.json`).

---

## 2. Schema: `quizzes/<quiz_id>.json` (Agent Writes)

Write UTF-8 JSON with the following structure:

```json
{
  "quiz_id": "<unique-slug-id>",
  "title": "<display title>",
  "subject": "<any subject or course name>",
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
      "hint": "<optional hint shown when clicking Hint>",
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
```

### Field Rules
- `subject`: Any subject/course string defined by the Agent (defaults to `"未分类"` if omitted). Subject filter tabs appear dynamically from your files.
- `pass_rate`: Number 0–100 (defaults to `80` if omitted).
- `glossary`: Optional key-value map of domain phrases (lowercase recommended). Click-to-translate prioritizes `glossary` with **longest-phrase match first**.
- `questions[].type`: Only `"multiple_choice"` (4 options) or `"true_false"` (`["True", "False"]`).
- `questions[].correct_index`: 0-based integer index into `options`.

### Question Formatting & Markdown Rules (Important — Strictly Follow)
StudyHub renders `stem`, `options`, `hint`, and `explanation_zh` using a native Markdown AST renderer. Do **not** pack multi-step or multi-item text onto a single line, and do **not** leave raw unclosed symbols exposed:

1. **Multi-Step & Numbered List Line Breaks（步骤与编号必须逐行换行）**:
   - Whenever a `stem`, `option`, `hint`, or `explanation_zh` contains multiple steps or numbered points (`Step 1` / `步骤 1` / `1.` / `2.` / `3.` / `4.`), **NEVER** string them together in one sentence or separate them inline with semicolons (`;`).
   - Always put **each step or item on its own line** (`\n`):
     ```markdown
     1. Define the objective
     2. Collect primary and secondary data
     3. Analyse and interpret findings
     4. Draw conclusions and act
     ```
     or:
     ```markdown
     步骤 1：明确调研目标
     步骤 2：收集一手与二手数据
     步骤 3：分析并解读结果
     步骤 4：得出结论并采取行动
     ```

2. **Sub-Items Inside Options (`A / B / C` 选项内分项也必须逐行换行)**:
   - If a single option contains sub-items such as `A / B / C`, `Pros / Cons`, `Price / Quality / Timing`, or paired concepts, **NEVER** squeeze them into one run-on sentence.
   - Format each sub-item on its own line with clean Markdown:
     ```markdown
     A. First sub-item
     B. Second sub-item
     C. Third sub-item
     ```
     or:
     ```markdown
     - **Price**: Show long-term cost savings
     - **Quality**: Provide samples and client references
     - **Timing**: Confirm expected decision date politely
     ```

3. **Clean Standard Markdown Only（纯正 Markdown 显示，禁止裸露符号）**:
   - Use standard Markdown syntax: `**bold**`, `*italic*`, `` `inline code` ``, `- ` bullet lists, `1. ` numbered lists, `> ` blockquotes, tables, and fenced code blocks.
   - **NEVER** emit decorative raw stars (`***`, `******`), raw `•` bullets, `1)` without newlines, unspaced headings/lists (`###Title`, `-item`), or unclosed `**`.
   - When providing bilingual English + Chinese content, separate the English block and Chinese block cleanly onto separate lines (e.g. `<English>\n【中文】<Chinese>`). StudyHub automatically renders `【中文】` / `【中文提示】` as a clean visual divider badge.

---

## 3. Schema: `vocab_inbox/<batch_name>.json` (Agent Writes)

Drop a JSON file into `vocab_inbox/` to recommend words/phrases for Joel's vocabulary library:

```json
{
  "words": [
    {
      "word": "<word or phrase in base form>",
      "meaning_zh": "<concise Chinese meaning>",
      "phonetic": "<optional IPA>",
      "pos": "<optional part of speech, e.g. n. / v. / adj.>",
      "context": "<optional English sentence containing the word>",
      "source": "<optional source label>",
      "subject": "<any subject or course name>"
    }
  ]
}
```

- Deduplication is case-insensitive on `word`: if the word already exists in `vocab.json`, it is skipped without overwriting Joel's status or review schedule.
- Newly merged words start with `status: "learning"`, `lookup_count: 1`, and `review.interval_days: 1`.
- StudyHub deletes the `vocab_inbox/*.json` file immediately after merging.

---

## 4. Schema: `results/<quiz_id>_<YYYY-MM-DD_HH-mm-ss>.json` (Agent Reads)

Generated automatically by StudyHub when Joel completes a quiz:

```json
{
  "quiz_id": "<quiz_id>",
  "title": "<title>",
  "subject": "<any subject or course name>",
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
```

- `chosen_index: -1` means Joel skipped that question.
- `words_looked_up` lists unique words/phrases Joel clicked for translation during the quiz — ideal input for generating follow-up explanations or `vocab_inbox` entries.

---

## 5. Schema: `vocab.json` (Agent Reads Only)

```json
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
      "subject": "<any subject or course name>",
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
```

- `lookup_count` increments every time Joel clicks the same word again — high counts highlight words Joel repeatedly forgets.
- Only Joel manually marks words as `"learned"`; do not overwrite `vocab.json`.

---

## 6. Launching the Windows Desktop Client

- Double-click `启动桌面版.bat` (or run `npm run tauri:dev`).
- Package a standalone `.exe` installer with `打包Windows安装包.bat` (or `npm run tauri:build`).
- StudyHub runs via **Tauri v2 + Rust native IPC** (`notify` file watcher + local WebView2) with **zero localhost and zero open HTTP ports**.
