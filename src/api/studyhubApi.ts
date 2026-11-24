/**
 * StudyHub 前端数据访问层
 * - 在 Windows Tauri v2 桌面客户端中：100% 走原生 Rust IPC（@tauri-apps/api invoke / listen），零 localhost、零 HTTP 端口
 * - 在云端浏览器预览环境降级时：自动回退到 /api/* 与 SSE，保持在线预览可用
 */

import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
import { lookupWord as localLookupWord } from '../lib/dictionary';

export interface StudyHubEventPayload {
  type?: 'vocab_updated' | 'quizzes_updated' | 'inbox_merged' | 'dict_updated' | 'results_updated';
  message?: string;
  addedCount?: number;
}

function isTauriDesktop(): boolean {
  try {
    return typeof window !== 'undefined' && isTauri();
  } catch {
    return false;
  }
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
    return isTauriDesktop();
  },

  getStatus(): Promise<FolderStatus> {
    if (isTauriDesktop()) return invoke<FolderStatus>('get_status');
    return requestJson<FolderStatus>('/api/status');
  },

  setDataDir(dataDir: string): Promise<FolderStatus> {
    if (isTauriDesktop()) return invoke<FolderStatus>('set_data_dir', { dataDir });
    return requestJson<FolderStatus>('/api/settings/data-dir', {
      method: 'POST',
      body: JSON.stringify({ dataDir }),
    });
  },

  async pickDataDir(): Promise<{ canceled: boolean; status?: FolderStatus }> {
    if (isTauriDesktop()) {
      return invoke<{ canceled: boolean; status?: FolderStatus }>('pick_data_dir');
    }
    return { canceled: true };
  },

  async openDataDir(): Promise<{ ok: boolean; error?: string }> {
    if (isTauriDesktop()) return invoke<{ ok: boolean; error?: string }>('open_data_dir');
    return { ok: false, error: '仅桌面客户端支持直接打开系统资源管理器' };
  },

  getVocab(): Promise<VocabFile> {
    if (isTauriDesktop()) return invoke<VocabFile>('get_vocab');
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
    if (isTauriDesktop()) {
      return invoke<{ entry: VocabEntry; isNew: boolean; vocab: VocabFile }>('add_vocab', {
        payload,
      });
    }
    return requestJson('/api/vocab', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateVocab(
    id: string,
    patch: { meaning_zh?: string; status?: VocabStatus; subject?: string; context?: string },
  ): Promise<VocabFile> {
    if (isTauriDesktop()) return invoke<VocabFile>('update_vocab', { id, patch });
    return requestJson<VocabFile>(`/api/vocab/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteVocab(id: string): Promise<VocabFile> {
    if (isTauriDesktop()) return invoke<VocabFile>('delete_vocab', { id });
    return requestJson<VocabFile>(`/api/vocab/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  recordReview(id: string, remembered: boolean): Promise<VocabFile> {
    if (isTauriDesktop()) return invoke<VocabFile>('record_review', { id, remembered });
    return requestJson<VocabFile>(`/api/vocab/review/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ remembered }),
    });
  },

  exportMarkdown(): Promise<{ markdown: string; path: string }> {
    if (isTauriDesktop()) return invoke<{ markdown: string; path: string }>('export_markdown');
    return requestJson('/api/vocab/export-markdown');
  },

  importInbox(
    filename: string,
    data: { words: unknown[] },
  ): Promise<{ addedCount: number; vocab: VocabFile }> {
    if (isTauriDesktop()) {
      return invoke<{ addedCount: number; vocab: VocabFile }>('import_inbox', {
        filename,
        data,
      });
    }
    return requestJson('/api/inbox/import', {
      method: 'POST',
      body: JSON.stringify({ filename, data }),
    });
  },

  getQuizzes(): Promise<{ quizzes: QuizFile[] }> {
    if (isTauriDesktop()) return invoke<{ quizzes: QuizFile[] }>('get_quizzes');
    return requestJson('/api/quizzes');
  },

  importQuiz(filename: string, quiz: QuizFile): Promise<{ quiz: QuizFile; quizzes: QuizFile[] }> {
    if (isTauriDesktop()) {
      return invoke<{ quiz: QuizFile; quizzes: QuizFile[] }>('import_quiz', {
        filename,
        quiz,
      });
    }
    return requestJson('/api/quizzes/import', {
      method: 'POST',
      body: JSON.stringify({ filename, quiz }),
    });
  },

  getResults(): Promise<{ results: QuizResultFile[] }> {
    if (isTauriDesktop()) return invoke<{ results: QuizResultFile[] }>('get_results');
    return requestJson('/api/results');
  },

  saveResult(filename: string, result: QuizResultFile): Promise<{ result: QuizResultFile }> {
    if (isTauriDesktop()) {
      return invoke<{ result: QuizResultFile }>('save_result', { filename, result });
    }
    return requestJson('/api/results', {
      method: 'POST',
      body: JSON.stringify({ filename, result }),
    });
  },

  async lookup(
    surface: string,
    options: { glossary?: Record<string, string>; matchedGlossaryKey?: string } = {},
  ): Promise<LookupResult> {
    if (isTauriDesktop()) {
      return invoke<LookupResult>('lookup_word_cmd', { surface, options });
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
    if (isTauriDesktop()) {
      return invoke<FolderStatus>('import_dict_csv', { filename, content });
    }
    return requestJson('/api/dict/import-csv', {
      method: 'POST',
      body: JSON.stringify({ filename, content }),
    });
  },

  /**
   * 实时监听数据文件夹变化：
   * - Tauri v2 桌面客户端使用原生 Rust notify + Tauri Event（零 SSE、零 localhost）
   * - 网页预览模式回退到 SSE (/api/events)
   */
  subscribeEvents(onEvent: (event: StudyHubEventPayload) => void): () => void {
    if (isTauriDesktop()) {
      let disposed = false;
      let unlistenFn: (() => void) | null = null;
      void listen<StudyHubEventPayload>('studyhub:event', (evt) => {
        if (!disposed && evt.payload) {
          onEvent(evt.payload);
        }
      }).then((fn) => {
        if (disposed) {
          fn();
        } else {
          unlistenFn = fn;
        }
      });
      return () => {
        disposed = true;
        unlistenFn?.();
      };
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
    if (isTauriDesktop()) return invoke<AppUpdateState>('get_update_state');
    return {
      currentVersion: '1.0.1',
      isPackaged: false,
      isPortable: false,
      supported: false,
      phase: 'unsupported',
      message: '仅 Windows Tauri 安装版客户端（StudyHub-Setup-*.exe）支持应用内直连 GitHub Releases 升级。',
    };
  },

  async checkForUpdates(): Promise<AppUpdateState> {
    if (isTauriDesktop()) return invoke<AppUpdateState>('check_for_updates');
    return this.getUpdateState();
  },

  async downloadUpdate(): Promise<AppUpdateState> {
    if (isTauriDesktop()) return invoke<AppUpdateState>('download_update');
    return this.getUpdateState();
  },

  async quitAndInstall(): Promise<{ ok: boolean; error?: string }> {
    if (isTauriDesktop()) {
      return invoke<{ ok: boolean; error?: string }>('quit_and_install');
    }
    return { ok: false };
  },

  async openReleasesPage(): Promise<{ ok: boolean; error?: string }> {
    if (isTauriDesktop()) {
      return invoke<{ ok: boolean; error?: string }>('open_releases_page');
    }
    return { ok: false, error: '仅桌面客户端支持直接打开外部浏览器' };
  },

  subscribeUpdateStatus(onUpdate: (state: AppUpdateState) => void): () => void {
    if (isTauriDesktop()) {
      let disposed = false;
      let unlistenFn: (() => void) | null = null;
      void listen<AppUpdateState>('studyhub:update-status', (evt) => {
        if (!disposed && evt.payload) {
          onUpdate(evt.payload);
        }
      }).then((fn) => {
        if (disposed) {
          fn();
        } else {
          unlistenFn = fn;
        }
      });
      return () => {
        disposed = true;
        unlistenFn?.();
      };
    }
    return () => {};
  },
};
