/**
 * StudyHub 核心数据结构定义
 * 严格兼容 Joel 的本地 JSON 文件协议（供外部 AI 私教共同读写）
 */

export type SubjectCode = 'ICT' | 'BE' | 'ES' | 'BO' | '其他';

export const SUBJECT_OPTIONS: SubjectCode[] = ['ICT', 'BE', 'ES', 'BO', '其他'];

export type VocabStatus = 'learning' | 'learned';

export interface VocabReview {
  /** 下次复习日期，格式 YYYY-MM-DD */
  next_review: string;
  /** 当前间隔天数：1 -> 3 -> 7 -> 14 */
  interval_days: number;
}

export interface VocabEntry {
  id: string;
  word: string;
  meaning_zh: string;
  phonetic: string;
  pos: string;
  context: string;
  source: string;
  subject: SubjectCode;
  status: VocabStatus;
  added_at: string;
  learned_at: string | null;
  lookup_count: number;
  review: VocabReview;
}

export interface VocabFile {
  version: 1;
  words: VocabEntry[];
}

export interface VocabInboxItem {
  word: string;
  meaning_zh: string;
  phonetic?: string;
  pos?: string;
  context?: string;
  source?: string;
  subject?: string;
}

export interface VocabInboxFile {
  words: VocabInboxItem[];
}

export type QuizQuestionType = 'multiple_choice' | 'true_false';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  stem: string;
  options: string[];
  correct_index: number;
  explanation_zh: string;
  hint?: string;
  source?: string;
}

export interface QuizFile {
  quiz_id: string;
  title: string;
  subject: SubjectCode;
  pass_rate: number;
  glossary?: Record<string, string>;
  questions: QuizQuestion[];
  /** 文件名（由服务端加载时补充，方便展示） */
  _filename?: string;
}

export interface QuizAnswerRecord {
  id: string;
  chosen_index: number;
  correct: boolean;
  used_hint: boolean;
}

export interface QuizResultFile {
  quiz_id: string;
  title: string;
  subject: SubjectCode;
  finished_at: string;
  score: number;
  total: number;
  percent: number;
  answers: QuizAnswerRecord[];
  words_looked_up: string[];
  /** 保存的文件名（仅前端展示用） */
  _filename?: string;
}

export type LookupSource = 'glossary' | 'acronym' | 'ecdict' | 'not_found';

export interface LookupResult {
  /** 查找到的标准词形 / 词组 */
  word: string;
  /** 用户点击的原始词形 */
  surface: string;
  phonetic: string;
  pos: string;
  meaning_zh: string;
  source: LookupSource;
  /** 词形还原说明，如 "went → go" */
  lemmaNote?: string;
  found: boolean;
}

export interface EcdictRecord {
  word: string;
  phonetic: string;
  pos: string;
  translation: string;
  /** ECDICT exchange 字段，如 "p:went/d:gone/i:going/3:goes" */
  exchange?: string;
}

export type FontScale = 'normal' | 'large' | 'xlarge';

export interface AppPreferences {
  theme: 'light' | 'dark';
  fontScale: FontScale;
}

export interface FolderStatus {
  dataDir: string;
  defaultWindowsDir: string;
  platform: string;
  vocabCount: number;
  learningCount: number;
  learnedCount: number;
  quizCount: number;
  resultCount: number;
  ecdictEntriesCount: number;
  hasExternalEcdict: boolean;
  exportExists: boolean;
  exportPath: string;
  lastSyncedAt: string;
}
