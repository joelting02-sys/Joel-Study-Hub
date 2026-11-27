/**
 * StudyHub 本地文件存储与实时监听模块
 * - 全部数据存为本地 JSON / Markdown 文件，无云数据库、无登录
 * - 所有写入一律采用「先写临时文件再 rename」的原子写入（atomic write）防止文件损坏
 * - 使用 chokidar 实时监听 quizzes/、vocab_inbox/ 和 dict/，外部 AI 私教写入新文件后自动刷新
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import chokidar, { type FSWatcher } from 'chokidar';
import type {
  EcdictRecord,
  FolderStatus,
  LookupResult,
  QuizFile,
  QuizResultFile,
  VocabEntry,
  VocabFile,
  VocabInboxFile,
  VocabStatus,
} from '../src/types/studyhub.ts';
import {
  buildDictionaryIndex,
  lookupWord,
  type DictionaryIndex,
} from '../src/lib/dictionary.ts';
import { BUILTIN_ECDICT_RECORDS } from '../src/lib/ecdictSeed.ts';
import {
  addOrIncrementVocab,
  calculateNextReview,
  exportVocabToMarkdown,
  formatDateYmd,
  markWordStatus,
  mergeInboxWords,
  normalizeSubject,
  type AddVocabInput,
} from '../src/lib/vocabLogic.ts';
import { AGENT_GUIDE_CONTENT } from './agentGuide.ts';

const CONFIG_FILE_PATH = path.resolve(process.cwd(), 'studyhub-config.json');

export interface StorageChangeEvent {
  type: 'vocab_updated' | 'quizzes_updated' | 'inbox_merged' | 'dict_updated' | 'results_updated';
  message?: string;
  addedCount?: number;
}

/**
 * 原子写入：先写入同目录临时文件，再 rename 覆盖目标文件
 * 即使写到一半断电或崩溃，原文件也不会损坏或变空
 */
export function atomicWriteFileSync(targetPath: string, content: string): void {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, targetPath);
}

/**
 * 简易 RFC4180 CSV 单行解析器，用于零原生依赖读取 skywind3000/ECDICT 的 ecdict.csv
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

export class StudyHubStorage extends EventEmitter {
  private dataDir: string;
  private watcher: FSWatcher | null = null;
  private dictIndex: DictionaryIndex;
  private hasExternalEcdict = false;
  private lastSyncedAt: string = new Date().toISOString();

  constructor() {
    super();
    this.dataDir = this.resolveInitialDataDir();
    this.dictIndex = buildDictionaryIndex(BUILTIN_ECDICT_RECORDS);
    this.initializeDataDir();
    this.loadExternalDictionary();
    this.startWatching();
  }

  public getDefaultWindowsDir(): string {
    if (process.platform === 'win32') {
      return path.join(os.homedir(), 'Documents', 'StudyHub');
    }
    return 'C:\\Users\\joelt\\Documents\\StudyHub';
  }

  private resolveInitialDataDir(): string {
    // 1. 优先读取用户在设置里保存的路径
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
        if (parsed && typeof parsed.dataDir === 'string' && parsed.dataDir.trim()) {
          return parsed.dataDir.trim();
        }
      }
    } catch {
      // 忽略损坏的配置文件，回退到默认路径
    }

    // 2. 环境变量覆盖（Electron 主进程可通过此项传入）
    if (process.env.STUDYHUB_DATA_DIR) {
      return process.env.STUDYHUB_DATA_DIR;
    }

    // 3. Windows 默认 C:\Users\<user>\Documents\StudyHub，其他平台（如在线预览容器）使用当前项目目录 StudyHub-Data
    if (process.platform === 'win32') {
      return path.join(os.homedir(), 'Documents', 'StudyHub');
    }
    return path.resolve(process.cwd(), 'StudyHub-Data');
  }

  public getDataDir(): string {
    return this.dataDir;
  }

  private getSubPath(...parts: string[]): string {
    return path.join(this.dataDir, ...parts);
  }

  /**
   * 初始化 StudyHub 所需的全部子目录（零预设示例数据，直接供外部 AI Agent 使用）
   * 并在数据根目录生成 AGENT_GUIDE.md，方便 Agent 直接读懂全部文件协议
   */
  private initializeDataDir(): void {
    const dirs = [
      this.dataDir,
      this.getSubPath('vocab_inbox'),
      this.getSubPath('quizzes'),
      this.getSubPath('results'),
      this.getSubPath('dict'),
      this.getSubPath('exports'),
    ];
    for (const d of dirs) {
      fs.mkdirSync(d, { recursive: true });
    }

    // 如果 vocab.json 尚不存在，初始化空白词库（无预设示例词）并同步导出空白 Markdown
    const vocabPath = this.getSubPath('vocab.json');
    if (!fs.existsSync(vocabPath)) {
      this.writeVocabFile({ version: 1, words: [] });
    } else {
      const exportPath = this.getSubPath('exports', '单词库.md');
      if (!fs.existsSync(exportPath)) {
        this.exportMarkdown(this.readVocabFile().words);
      }
    }

    // 在数据根目录生成 AGENT_GUIDE.md，让外部 AI Agent 打开目录即可直接上手
    const guidePath = this.getSubPath('AGENT_GUIDE.md');
    if (!fs.existsSync(guidePath)) {
      atomicWriteFileSync(guidePath, AGENT_GUIDE_CONTENT);
    }

    // 启动时处理已存在的 vocab_inbox 文件
    this.processAllInboxFiles();
  }

  /**
   * 切换数据文件夹路径并重新初始化监听
   */
  public setDataDir(newDir: string): FolderStatus {
    const trimmed = newDir.trim();
    if (!trimmed) {
      throw new Error('数据目录路径不能为空');
    }
    const resolved = path.resolve(trimmed);
    fs.mkdirSync(resolved, { recursive: true });

    this.dataDir = resolved;
    let existingCfg: Record<string, unknown> = {};
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          existingCfg = parsed as Record<string, unknown>;
        }
      }
    } catch {
      existingCfg = {};
    }
    atomicWriteFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify({ ...existingCfg, dataDir: this.dataDir }, null, 2),
    );

    this.initializeDataDir();
    this.loadExternalDictionary();
    this.startWatching();
    this.notify({ type: 'vocab_updated', message: '已切换数据目录' });
    this.notify({ type: 'quizzes_updated' });
    return this.getStatus();
  }

  /**
   * 启动 chokidar 实时文件监听：
   * - quizzes/*.json 新增/修改/删除 -> 自动通知前端刷新测验列表
   * - vocab_inbox/*.json 新增 -> 自动合并进 vocab.json 并删除原文件
   * - dict/ 变化 -> 自动重载离线词典
   */
  private startWatching(): void {
    if (this.watcher) {
      void this.watcher.close();
      this.watcher = null;
    }

    const watchTargets = [
      this.getSubPath('quizzes'),
      this.getSubPath('vocab_inbox'),
      this.getSubPath('dict'),
    ];

    this.watcher = chokidar.watch(watchTargets, {
      ignoreInitial: true,
      depth: 1,
      awaitWriteFinish: {
        stabilityThreshold: 250,
        pollInterval: 50,
      },
    });

    const quizzesDir = path.resolve(this.getSubPath('quizzes'));
    const inboxDir = path.resolve(this.getSubPath('vocab_inbox'));
    const dictDir = path.resolve(this.getSubPath('dict'));

    this.watcher.on('all', (event, filePath) => {
      const resolved = path.resolve(filePath);
      const lower = resolved.toLowerCase();
      if (lower.includes('.tmp.')) return;

      if (resolved.startsWith(inboxDir) && lower.endsWith('.json') && (event === 'add' || event === 'change')) {
        this.processSingleInboxFile(resolved);
      } else if (resolved.startsWith(quizzesDir) && lower.endsWith('.json')) {
        this.lastSyncedAt = new Date().toISOString();
        this.notify({ type: 'quizzes_updated', message: '检测到测验文件更新' });
      } else if (resolved.startsWith(dictDir) && (lower.endsWith('.csv') || lower.endsWith('.json'))) {
        this.loadExternalDictionary();
        this.notify({ type: 'dict_updated', message: '离线词典已重载' });
      }
    });
  }

  public async close(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  private notify(event: StorageChangeEvent): void {
    this.lastSyncedAt = new Date().toISOString();
    this.emit('change', event);
  }

  /**
   * 加载 dict/ 目录下可选的外部 ECDICT 文件（ecdict.csv 或 ecdict.json）
   * 与内置基础词典合并，实现开箱即用 + 支持完整 77 万词库扩展
   */
  public loadExternalDictionary(): void {
    const dictDir = this.getSubPath('dict');
    const records: EcdictRecord[] = [...BUILTIN_ECDICT_RECORDS];
    let loadedExternal = false;

    try {
      const files = fs.readdirSync(dictDir);
      const jsonFile = files.find((f) => f.toLowerCase().endsWith('.json'));
      const csvFile = files.find((f) => f.toLowerCase().endsWith('.csv'));

      if (jsonFile) {
        const parsed = JSON.parse(fs.readFileSync(path.join(dictDir, jsonFile), 'utf-8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item.word === 'string') {
              records.push({
                word: item.word,
                phonetic: item.phonetic || '',
                pos: item.pos || '',
                translation: item.translation || item.meaning_zh || '',
                exchange: item.exchange || '',
              });
            }
          }
          loadedExternal = true;
        }
      }

      if (csvFile) {
        const raw = fs.readFileSync(path.join(dictDir, csvFile), 'utf-8');
        const lines = raw.split(/\r?\n/);
        if (lines.length > 1) {
          const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
          const wordIdx = header.indexOf('word');
          const phoneticIdx = header.indexOf('phonetic');
          const transIdx = header.indexOf('translation');
          const posIdx = header.indexOf('pos');
          const exchangeIdx = header.indexOf('exchange');

          if (wordIdx !== -1 && transIdx !== -1) {
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              if (!line) continue;
              const cols = parseCsvLine(line);
              const word = (cols[wordIdx] || '').trim();
              const translation = (cols[transIdx] || '').trim();
              if (!word || !translation) continue;
              records.push({
                word,
                phonetic: phoneticIdx !== -1 ? (cols[phoneticIdx] || '').trim() : '',
                pos: posIdx !== -1 ? (cols[posIdx] || '').trim() : '',
                translation,
                exchange: exchangeIdx !== -1 ? (cols[exchangeIdx] || '').trim() : '',
              });
            }
            loadedExternal = true;
          }
        }
      }
    } catch (err) {
      console.error('[StudyHub] 加载外部离线词典失败:', err);
    }

    this.dictIndex = buildDictionaryIndex(records);
    this.hasExternalEcdict = loadedExternal;
  }

  public saveExternalDictCsv(filename: string, csvContent: string): FolderStatus {
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_') || 'ecdict.csv';
    const finalName = safeName.endsWith('.csv') ? safeName : `${safeName}.csv`;
    atomicWriteFileSync(this.getSubPath('dict', finalName), csvContent);
    this.loadExternalDictionary();
    this.notify({ type: 'dict_updated', message: `已导入离线词典 ${finalName}` });
    return this.getStatus();
  }

  public lookup(
    surface: string,
    options: { glossary?: Record<string, string>; matchedGlossaryKey?: string } = {},
  ): LookupResult {
    return lookupWord(surface, {
      ...options,
      dictIndex: this.dictIndex,
    });
  }

  // ==================== Vocab 读写 ====================

  public readVocabFile(): VocabFile {
    const vocabPath = this.getSubPath('vocab.json');
    try {
      if (!fs.existsSync(vocabPath)) {
        return { version: 1, words: [] };
      }
      const parsed = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'));
      if (parsed && Array.isArray(parsed.words)) {
        return { version: 1, words: parsed.words };
      }
    } catch (err) {
      console.error('[StudyHub] 读取 vocab.json 失败:', err);
    }
    return { version: 1, words: [] };
  }

  private writeVocabFile(vocabFile: VocabFile): void {
    const vocabPath = this.getSubPath('vocab.json');
    atomicWriteFileSync(vocabPath, JSON.stringify(vocabFile, null, 2));
    this.exportMarkdown(vocabFile.words);
  }

  public exportMarkdown(words?: VocabEntry[]): string {
    const list = words ?? this.readVocabFile().words;
    const md = exportVocabToMarkdown(list);
    atomicWriteFileSync(this.getSubPath('exports', '单词库.md'), md);
    return md;
  }

  public addVocab(input: AddVocabInput): { entry: VocabEntry; isNew: boolean; vocab: VocabFile } {
    const current = this.readVocabFile();
    const res = addOrIncrementVocab(current.words, input);
    const updatedFile: VocabFile = { version: 1, words: res.words };
    this.writeVocabFile(updatedFile);
    this.notify({ type: 'vocab_updated' });
    return { entry: res.entry, isNew: res.isNew, vocab: updatedFile };
  }

  public updateVocab(
    id: string,
    patch: {
      word?: string;
      meaning_zh?: string;
      phonetic?: string;
      pos?: string;
      status?: VocabStatus;
      subject?: string;
      context?: string;
    },
  ): VocabFile {
    const current = this.readVocabFile();
    let words = current.words;

    if (patch.word !== undefined) {
      const trimmed = patch.word.trim();
      if (!trimmed) {
        throw new Error('英文单词不能为空');
      }
      const newKey = normalizeWordKey(trimmed);
      if (words.some((w) => w.id !== id && normalizeWordKey(w.word) === newKey)) {
        throw new Error(`单词库中已存在「${trimmed}」`);
      }
    }

    if (patch.status) {
      words = markWordStatus(words, id, patch.status);
    }

    words = words.map((w) => {
      if (w.id !== id) return w;
      return {
        ...w,
        word: patch.word !== undefined ? patch.word.trim() : w.word,
        meaning_zh: patch.meaning_zh !== undefined ? patch.meaning_zh.trim() : w.meaning_zh,
        phonetic: patch.phonetic !== undefined ? patch.phonetic.trim() : w.phonetic,
        pos: patch.pos !== undefined ? patch.pos.trim() : w.pos,
        subject: patch.subject !== undefined ? normalizeSubject(patch.subject) : w.subject,
        context: patch.context !== undefined ? patch.context.trim() : w.context,
      };
    });

    const updatedFile: VocabFile = { version: 1, words };
    this.writeVocabFile(updatedFile);
    this.notify({ type: 'vocab_updated' });
    return updatedFile;
  }

  public deleteVocab(id: string): VocabFile {
    const current = this.readVocabFile();
    const words = current.words.filter((w) => w.id !== id);
    const updatedFile: VocabFile = { version: 1, words };
    this.writeVocabFile(updatedFile);
    this.notify({ type: 'vocab_updated' });
    return updatedFile;
  }

  public recordReview(id: string, remembered: boolean): VocabFile {
    const current = this.readVocabFile();
    const today = formatDateYmd();
    const words = current.words.map((w) => {
      if (w.id !== id) return w;
      const nextReview = calculateNextReview(w.review.interval_days, remembered, today);
      return {
        ...w,
        review: nextReview,
      };
    });
    const updatedFile: VocabFile = { version: 1, words };
    this.writeVocabFile(updatedFile);
    this.notify({ type: 'vocab_updated' });
    return updatedFile;
  }

  // ==================== vocab_inbox 合并 ====================

  private processAllInboxFiles(): void {
    const inboxDir = this.getSubPath('vocab_inbox');
    if (!fs.existsSync(inboxDir)) return;
    const files = fs.readdirSync(inboxDir).filter((f) => f.toLowerCase().endsWith('.json') && !f.includes('.tmp.'));
    for (const file of files) {
      this.processSingleInboxFile(path.join(inboxDir, file));
    }
  }

  public processSingleInboxFile(filePath: string): number {
    try {
      if (!fs.existsSync(filePath)) return 0;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as VocabInboxFile | VocabInboxFile['words'];
      const inboxWords = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.words)
          ? parsed.words
          : null;
      if (!inboxWords) return 0;

      const current = this.readVocabFile();
      const merged = mergeInboxWords(current.words, inboxWords);
      if (merged.addedCount > 0) {
        this.writeVocabFile({ version: 1, words: merged.words });
      }
      // 合并成功后删除该 inbox 文件
      fs.unlinkSync(filePath);
      this.notify({
        type: 'inbox_merged',
        addedCount: merged.addedCount,
        message: `已从 vocab_inbox 合并 ${merged.addedCount} 个新单词`,
      });
      return merged.addedCount;
    } catch (err) {
      console.error(`[StudyHub] 处理 vocab_inbox 文件失败 (${filePath}):`, err);
      return 0;
    }
  }

  public dropInboxFile(filename: string, content: VocabInboxFile): { addedCount: number; vocab: VocabFile } {
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_') || `inbox_${Date.now()}.json`;
    const finalName = safeName.endsWith('.json') ? safeName : `${safeName}.json`;
    const filePath = this.getSubPath('vocab_inbox', finalName);
    atomicWriteFileSync(filePath, JSON.stringify(content, null, 2));
    // 立即处理（不等待 chokidar 延迟，避免重复处理前文件已被删）
    const addedCount = this.processSingleInboxFile(filePath);
    return { addedCount, vocab: this.readVocabFile() };
  }

  // ==================== Quizzes & Results ====================

  private normalizeQuiz(raw: QuizFile, filename: string): QuizFile {
    const questions = raw.questions.map((q, idx) => {
      const options = Array.isArray(q.options) ? q.options.map(String) : ['True', 'False'];
      const inferredType =
        q.type === 'true_false' || q.type === 'multiple_choice'
          ? q.type
          : options.length === 2
            ? 'true_false'
            : 'multiple_choice';
      return {
        ...q,
        id: q.id || `q${idx + 1}`,
        type: inferredType,
        options,
        explanation_zh: q.explanation_zh ?? '',
      };
    });

    return {
      ...raw,
      title: raw.title || raw.quiz_id,
      subject: normalizeSubject(raw.subject),
      pass_rate: typeof raw.pass_rate === 'number' ? raw.pass_rate : 80,
      glossary: raw.glossary && typeof raw.glossary === 'object' ? raw.glossary : {},
      questions,
      _filename: filename,
    };
  }

  public listQuizzes(): QuizFile[] {
    const quizzesDir = this.getSubPath('quizzes');
    if (!fs.existsSync(quizzesDir)) return [];

    const files = fs
      .readdirSync(quizzesDir)
      .filter((f) => f.toLowerCase().endsWith('.json') && !f.includes('.tmp.'))
      .sort();

    const quizzes: QuizFile[] = [];
    for (const f of files) {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(quizzesDir, f), 'utf-8')) as QuizFile;
        if (parsed && parsed.quiz_id && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          quizzes.push(this.normalizeQuiz(parsed, f));
        }
      } catch (err) {
        console.error(`[StudyHub] 解析测验文件失败 (${f}):`, err);
      }
    }
    return quizzes;
  }

  public importQuiz(filename: string, quiz: QuizFile): QuizFile {
    if (!quiz || !quiz.quiz_id || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error('测验 JSON 格式无效：需要包含 quiz_id 和非空的 questions 数组');
    }
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_') || `${quiz.quiz_id}.json`;
    const finalName = safeName.endsWith('.json') ? safeName : `${safeName}.json`;
    const normalized = this.normalizeQuiz(quiz, finalName);
    const { _filename: _ignored, ...cleanQuiz } = normalized;
    void _ignored;
    const targetPath = this.getSubPath('quizzes', finalName);
    atomicWriteFileSync(targetPath, JSON.stringify(cleanQuiz, null, 2));
    this.notify({ type: 'quizzes_updated', message: `已导入测验：${normalized.title}` });
    return normalized;
  }

  public saveQuizResult(filename: string, result: QuizResultFile): QuizResultFile {
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_');
    const finalName = safeName.endsWith('.json') ? safeName : `${safeName}.json`;
    const targetPath = this.getSubPath('results', finalName);
    // 写入磁盘时不包含 _filename 内部字段，保持与 AI 私教协议完全一致
    const { _filename: _ignored, ...cleanResult } = result;
    void _ignored;
    atomicWriteFileSync(targetPath, JSON.stringify(cleanResult, null, 2));
    this.notify({ type: 'results_updated', message: `测验结果已保存：${finalName}` });
    return { ...cleanResult, _filename: finalName };
  }

  public listResults(): QuizResultFile[] {
    const resultsDir = this.getSubPath('results');
    if (!fs.existsSync(resultsDir)) return [];

    const files = fs
      .readdirSync(resultsDir)
      .filter((f) => f.toLowerCase().endsWith('.json') && !f.includes('.tmp.'))
      .sort()
      .reverse();

    const results: QuizResultFile[] = [];
    for (const f of files.slice(0, 50)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf-8')) as QuizResultFile;
        if (parsed && parsed.quiz_id) {
          results.push({ ...parsed, _filename: f });
        }
      } catch {
        // 跳过无法解析的文件
      }
    }
    return results;
  }

  public getStatus(): FolderStatus {
    const vocab = this.readVocabFile();
    const learningCount = vocab.words.filter((w) => w.status === 'learning').length;
    const learnedCount = vocab.words.filter((w) => w.status === 'learned').length;
    const quizzes = this.listQuizzes();
    const results = this.listResults();
    const exportPath = this.getSubPath('exports', '单词库.md');

    return {
      dataDir: this.dataDir,
      defaultWindowsDir: this.getDefaultWindowsDir(),
      platform: process.platform,
      vocabCount: vocab.words.length,
      learningCount,
      learnedCount,
      quizCount: quizzes.length,
      resultCount: results.length,
      ecdictEntriesCount: this.dictIndex.byWord.size,
      hasExternalEcdict: this.hasExternalEcdict,
      exportExists: fs.existsSync(exportPath),
      exportPath,
      lastSyncedAt: this.lastSyncedAt,
    };
  }
}
