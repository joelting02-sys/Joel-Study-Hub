/**
 * StudyHub 核心数据结构定义
 * 严格兼容 Joel 的本地 JSON 文件协议（供外部 AI 私教共同读写）
 */

export type SubjectCode = string;

export type VocabStatus = 'learning' | 'learned';

export interface VocabReview {
  /** 下次复习日期，格式 YYYY-MM-DD */
  next_review: string;
  /** 当前间隔天数：1 -> 3 -> 7 -> 15 */
  interval_days: number;
}

export interface VocabAiCache {
  meaning_zh: string;
  context_zh?: string;
  plain_zh?: string;
  alternatives?: string[];
  synonyms?: string[];
  example_en?: string;
  phonetic?: string;
  pos?: string;
  model?: string;
  cached_at: string;
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
  ai_cache?: VocabAiCache;
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

export type LookupSource = 'glossary' | 'acronym' | 'ecdict' | 'api' | 'not_found';

export interface LookupResult {
  /** 查找到的标准词形 / 词组 */
  word: string;
  /** 用户点击的原始词形 */
  surface: string;
  phonetic: string;
  pos: string;
  meaning_zh: string;
  /** 在当前原句中最贴切的中文意思 */
  context_zh?: string;
  /** 未提供原句时由大模型生成的英文例句 */
  example_en?: string;
  /** 更直观的大白话 / 通俗中文解释 */
  plain_zh?: string;
  /** 其他常见中文说法 / 近义译法 */
  alternatives?: string[];
  /** 常见英文同义词或相近表达 */
  synonyms?: string[];
  /** 若调用了 AI 模型扩展释义，同时保留原测验 glossary 术语参考 */
  glossaryNote?: string;
  source: LookupSource;
  /** 词形还原说明，如 "went → go" */
  lemmaNote?: string;
  /** 若自动纠正了拼写错误，记录原错拼词 */
  correctedFrom?: string;
  /** 离线词典未收录时的拼写相似建议 */
  suggestions?: string[];
  found: boolean;
}

export type TranslationMode = 'auto_fallback' | 'always_api' | 'manual';

export interface TranslationApiStatus {
  configured: boolean;
  baseUrl: string;
  model: string;
  endpointHost: string;
  hasApiKey: boolean;
  apiKeyPreview?: string;
  error?: string;
}

export interface SaveTranslationConfigInput {
  baseUrl: string;
  /** 留空表示保持当前已保存的 API Key；传 clearApiKey=true 可清除 */
  apiKey?: string;
  clearApiKey?: boolean;
  model: string;
}

export interface FetchModelsInput {
  baseUrl?: string;
  apiKey?: string;
}

export interface FetchModelsResult {
  models: string[];
  count: number;
  note?: string;
}

export interface TranslateWordInput {
  surface: string;
  sentence?: string;
  subject?: string;
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

export type WordLookupTrigger = 'hover' | 'click';

export type SpeechAccent = 'en-US' | 'en-GB';
export type SpeechRate = 0.75 | 0.85 | 1 | 1.15;
export type SpeechEngine = 'online_cached' | 'offline_only';

export interface TtsAudioInput {
  text: string;
  accent?: SpeechAccent;
}

export interface TtsAudioResult {
  mime: string;
  audioBase64: string;
  cached: boolean;
}

export interface AppPreferences {
  theme: 'light' | 'dark';
  fontScale: FontScale;
  translationMode: TranslationMode;
  autoAddTranslatedVocab: boolean;
  wordLookupTrigger: WordLookupTrigger;
  speechAccent: SpeechAccent;
  speechRate: SpeechRate;
  speechEngine: SpeechEngine;
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

export type UpdatePhase =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface AppUpdateState {
  currentVersion: string;
  isPackaged: boolean;
  isPortable: boolean;
  supported: boolean;
  phase: UpdatePhase;
  latestVersion?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
  repoUrl?: string;
}
