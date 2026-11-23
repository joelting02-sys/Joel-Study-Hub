/**
 * StudyHub 前端数据访问层
 * - 在 Windows Electron 桌面客户端中：100% 走原生 Electron IPC (window.studyhubIPC)，零 localhost、零 HTTP 端口
 * - 在云端浏览器预览环境降级时：自动回退到 /api/* 以便在线预览测试
 */

import type {
  AppUpdateState,
  FolderStatus,
  LookupResult,
  QuizFile,
  QuizResultFile,
  VocabEntry,
  VocabFile,
  VocabStatus,
} from '../types/studyhub';
import type { StudyHubEventPayload } from '../types/electron';
import { lookupWord as localLookupWord } from '../lib/dictionary';

function getIpc() {
  return typeof window !== 'undefined' ? window.studyhubIPC : undefined;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) msg = errBody.error;
    } catch {
      // 忽略非 JSON 错误体
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const studyhubApi = {
  isDesktopClient(): boolean {
    return Boolean(getIpc()?.isElectron);
  },

  getStatus(): Promise<FolderStatus> {
    const ipc = getIpc();
    if (ipc) return ipc.getStatus();
    return requestJson<FolderStatus>('/api/status');
  },

  setDataDir(dataDir: string): Promise<FolderStatus> {
    const ipc = getIpc();
    if (ipc) return ipc.setDataDir(dataDir);
    return requestJson<FolderStatus>('/api/settings/data-dir', {
      method: 'POST',
      body: JSON.stringify({ dataDir }),
    });
  },

  async pickDataDir(): Promise<{ canceled: boolean; status?: FolderStatus }> {
    const ipc = getIpc();
    if (ipc) return ipc.pickDataDir();
    return { canceled: true };
  },

  async openDataDir(): Promise<{ ok: boolean; error?: string }> {
    const ipc = getIpc();
    if (ipc) return ipc.openDataDir();
    return { ok: false, error: '仅桌面客户端支持直接打开系统资源管理器' };
  },

  getVocab(): Promise<VocabFile> {
    const ipc = getIpc();
    if (ipc) return ipc.getVocab();
    return requestJson<VocabFile>('/api/vocab');
  },

  addVocab(payload: {
    word: string;
    meaning_zh: string;
    phonetic?: string;
    pos?: string;
    context?: string;
    source?: string;
    subject?: string;
  }): Promise<{ entry: VocabEntry; isNew: boolean; vocab: VocabFile }> {
    const ipc = getIpc();
    if (ipc) return ipc.addVocab(payload);
    return requestJson('/api/vocab', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateVocab(
    id: string,
    patch: { meaning_zh?: string; status?: VocabStatus; subject?: string; context?: string },
  ): Promise<VocabFile> {
    const ipc = getIpc();
    if (ipc) return ipc.updateVocab(id, patch);
    return requestJson<VocabFile>(`/api/vocab/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteVocab(id: string): Promise<VocabFile> {
    const ipc = getIpc();
    if (ipc) return ipc.deleteVocab(id);
    return requestJson<VocabFile>(`/api/vocab/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  recordReview(id: string, remembered: boolean): Promise<VocabFile> {
    const ipc = getIpc();
    if (ipc) return ipc.recordReview(id, remembered);
    return requestJson<VocabFile>(`/api/vocab/review/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ remembered }),
    });
  },

  exportMarkdown(): Promise<{ markdown: string; path: string }> {
    const ipc = getIpc();
    if (ipc) return ipc.exportMarkdown();
    return requestJson('/api/vocab/export-markdown');
  },

  importInbox(
    filename: string,
    data: { words: unknown[] },
  ): Promise<{ addedCount: number; vocab: VocabFile }> {
    const ipc = getIpc();
    if (ipc) return ipc.importInbox(filename, data);
    return requestJson('/api/inbox/import', {
      method: 'POST',
      body: JSON.stringify({ filename, data }),
    });
  },

  getQuizzes(): Promise<{ quizzes: QuizFile[] }> {
    const ipc = getIpc();
    if (ipc) return ipc.getQuizzes();
    return requestJson('/api/quizzes');
  },

  importQuiz(filename: string, quiz: QuizFile): Promise<{ quiz: QuizFile; quizzes: QuizFile[] }> {
    const ipc = getIpc();
    if (ipc) return ipc.importQuiz(filename, quiz);
    return requestJson('/api/quizzes/import', {
      method: 'POST',
      body: JSON.stringify({ filename, quiz }),
    });
  },

  getResults(): Promise<{ results: QuizResultFile[] }> {
    const ipc = getIpc();
    if (ipc) return ipc.getResults();
    return requestJson('/api/results');
  },

  saveResult(filename: string, result: QuizResultFile): Promise<{ result: QuizResultFile }> {
    const ipc = getIpc();
    if (ipc) return ipc.saveResult(filename, result);
    return requestJson('/api/results', {
      method: 'POST',
      body: JSON.stringify({ filename, result }),
    });
  },

  async lookup(
    surface: string,
    options: { glossary?: Record<string, string>; matchedGlossaryKey?: string } = {},
  ): Promise<LookupResult> {
    const ipc = getIpc();
    if (ipc) {
      return ipc.lookup(surface, options);
    }
    try {
      return await requestJson<LookupResult>('/api/dict/lookup', {
        method: 'POST',
        body: JSON.stringify({
          surface,
          glossary: options.glossary,
          matchedGlossaryKey: options.matchedGlossaryKey,
        }),
      });
    } catch {
      return localLookupWord(surface, options);
    }
  },

  importDictCsv(filename: string, content: string): Promise<FolderStatus> {
    const ipc = getIpc();
    if (ipc) return ipc.importDictCsv(filename, content);
    return requestJson('/api/dict/import-csv', {
      method: 'POST',
      body: JSON.stringify({ filename, content }),
    });
  },

  /**
   * 实时监听数据文件夹变化：
   * - Electron 桌面客户端使用原生 IPC 事件（零 SSE、零 localhost）
   * - 网页预览模式回退到 SSE (/api/events)
   */
  subscribeEvents(onEvent: (event: StudyHubEventPayload) => void): () => void {
    const ipc = getIpc();
    if (ipc) {
      return ipc.onEvent(onEvent);
    }
    if (typeof EventSource === 'undefined') {
      return () => {};
    }
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as StudyHubEventPayload;
          onEvent(data);
        } catch {
          // 忽略心跳帧
        }
      };
    } catch {
      return () => {};
    }
    return () => {
      es?.close();
    };
  },

  async getUpdateState(): Promise<AppUpdateState> {
    const ipc = getIpc();
    if (ipc?.getUpdateState) return ipc.getUpdateState();
    return {
      currentVersion: '1.0.0',
      isPackaged: false,
      isPortable: false,
      supported: false,
      phase: 'unsupported',
      message: '仅 Windows 安装版客户端（StudyHub-Setup-*.exe）支持在应用内直接通过 GitHub Releases 升级。',
    };
  },

  async checkForUpdates(): Promise<AppUpdateState> {
    const ipc = getIpc();
    if (ipc?.checkForUpdates) return ipc.checkForUpdates();
    return this.getUpdateState();
  },

  async downloadUpdate(): Promise<AppUpdateState> {
    const ipc = getIpc();
    if (ipc?.downloadUpdate) return ipc.downloadUpdate();
    return this.getUpdateState();
  },

  async quitAndInstall(): Promise<{ ok: boolean }> {
    const ipc = getIpc();
    if (ipc?.quitAndInstall) return ipc.quitAndInstall();
    return { ok: false };
  },

  async openReleasesPage(): Promise<{ ok: boolean; error?: string }> {
    const ipc = getIpc();
    if (ipc?.openReleasesPage) return ipc.openReleasesPage();
    return { ok: false, error: '仅桌面客户端支持直接打开外部浏览器' };
  },

  subscribeUpdateStatus(onUpdate: (state: AppUpdateState) => void): () => void {
    const ipc = getIpc();
    if (ipc?.onUpdateStatus) {
      return ipc.onUpdateStatus(onUpdate);
    }
    return () => {};
  },
};
