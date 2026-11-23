import type {
  AppUpdateState,
  FolderStatus,
  LookupResult,
  QuizFile,
  QuizResultFile,
  VocabEntry,
  VocabFile,
  VocabStatus,
} from './studyhub';

export interface StudyHubEventPayload {
  type?: 'vocab_updated' | 'quizzes_updated' | 'inbox_merged' | 'dict_updated' | 'results_updated';
  message?: string;
  addedCount?: number;
}

export interface StudyHubIPCBridge {
  isElectron: true;
  platform: string;
  getStatus(): Promise<FolderStatus>;
  setDataDir(dataDir: string): Promise<FolderStatus>;
  pickDataDir(): Promise<{ canceled: boolean; status: FolderStatus }>;
  openDataDir(): Promise<{ ok: boolean; error?: string }>;
  getVocab(): Promise<VocabFile>;
  addVocab(payload: {
    word: string;
    meaning_zh: string;
    phonetic?: string;
    pos?: string;
    context?: string;
    source?: string;
    subject?: string;
  }): Promise<{ entry: VocabEntry; isNew: boolean; vocab: VocabFile }>;
  updateVocab(
    id: string,
    patch: { meaning_zh?: string; status?: VocabStatus; subject?: string; context?: string },
  ): Promise<VocabFile>;
  deleteVocab(id: string): Promise<VocabFile>;
  recordReview(id: string, remembered: boolean): Promise<VocabFile>;
  exportMarkdown(): Promise<{ markdown: string; path: string }>;
  importInbox(filename: string, data: { words: unknown[] }): Promise<{ addedCount: number; vocab: VocabFile }>;
  getQuizzes(): Promise<{ quizzes: QuizFile[] }>;
  importQuiz(filename: string, quiz: QuizFile): Promise<{ quiz: QuizFile; quizzes: QuizFile[] }>;
  getResults(): Promise<{ results: QuizResultFile[] }>;
  saveResult(filename: string, result: QuizResultFile): Promise<{ result: QuizResultFile }>;
  lookup(
    surface: string,
    options?: { glossary?: Record<string, string>; matchedGlossaryKey?: string },
  ): Promise<LookupResult>;
  importDictCsv(filename: string, content: string): Promise<FolderStatus>;
  getUpdateState(): Promise<AppUpdateState>;
  checkForUpdates(): Promise<AppUpdateState>;
  downloadUpdate(): Promise<AppUpdateState>;
  quitAndInstall(): Promise<{ ok: boolean }>;
  openReleasesPage(): Promise<{ ok: boolean; error?: string }>;
  onEvent(callback: (payload: StudyHubEventPayload) => void): () => void;
  onUpdateStatus(callback: (state: AppUpdateState) => void): () => void;
}

declare global {
  interface Window {
    studyhubIPC?: StudyHubIPCBridge;
  }
}
