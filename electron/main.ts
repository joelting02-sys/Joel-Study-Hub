/**
 * StudyHub 纯原生 Electron 桌面端主进程源码（编译后输出到 electron/main.cjs）
 *
 * 架构特点（彻底告别 localhost）：
 * 1. 不启动 Express / HTTP 服务器，不占用任何 localhost 端口
 * 2. 通过 BrowserWindow.loadFile(dist/index.html) 直接离线加载前端界面
 * 3. 通过 Electron IPC (ipcMain.handle + webContents.send) 与界面双向通信
 * 4. 直接读写本地 C:\Users\<用户名>\Documents\StudyHub\，支持原生系统文件夹选择框与资源管理器打开
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import os from 'os';
import { StudyHubStorage, type StorageChangeEvent } from '../server/storage.ts';
import type { QuizFile, QuizResultFile, VocabInboxFile, VocabStatus } from '../src/types/studyhub.ts';

let mainWindow: BrowserWindow | null = null;
let storage: StudyHubStorage | null = null;

function ensureStorage(): StudyHubStorage {
  if (!storage) {
    if (!process.env.STUDYHUB_DATA_DIR && process.platform === 'win32') {
      process.env.STUDYHUB_DATA_DIR = path.join(os.homedir(), 'Documents', 'StudyHub');
    }
    storage = new StudyHubStorage();
    storage.on('change', (event: StorageChangeEvent) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('studyhub:event', event);
      }
    });
  }
  return storage;
}

function registerIpcHandlers(): void {
  const store = ensureStorage();

  ipcMain.handle('studyhub:getStatus', () => store.getStatus());

  ipcMain.handle('studyhub:setDataDir', (_evt, dataDir: string) => store.setDataDir(dataDir));

  ipcMain.handle('studyhub:pickDataDir', async () => {
    const win = mainWindow ?? undefined;
    const res = await dialog.showOpenDialog(win, {
      title: '选择 StudyHub 数据文件夹',
      defaultPath: store.getDataDir(),
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || res.filePaths.length === 0) {
      return { canceled: true, status: store.getStatus() };
    }
    const status = store.setDataDir(res.filePaths[0]);
    return { canceled: false, status };
  });

  ipcMain.handle('studyhub:openDataDir', async () => {
    const err = await shell.openPath(store.getDataDir());
    return { ok: !err, error: err || undefined };
  });

  ipcMain.handle('studyhub:getVocab', () => store.readVocabFile());

  ipcMain.handle(
    'studyhub:addVocab',
    (
      _evt,
      payload: {
        word: string;
        meaning_zh: string;
        phonetic?: string;
        pos?: string;
        context?: string;
        source?: string;
        subject?: string;
      },
    ) => store.addVocab(payload),
  );

  ipcMain.handle(
    'studyhub:updateVocab',
    (
      _evt,
      id: string,
      patch: { meaning_zh?: string; status?: VocabStatus; subject?: string; context?: string },
    ) => store.updateVocab(id, patch),
  );

  ipcMain.handle('studyhub:deleteVocab', (_evt, id: string) => store.deleteVocab(id));

  ipcMain.handle('studyhub:recordReview', (_evt, id: string, remembered: boolean) =>
    store.recordReview(id, Boolean(remembered)),
  );

  ipcMain.handle('studyhub:exportMarkdown', () => ({
    markdown: store.exportMarkdown(),
    path: store.getStatus().exportPath,
  }));

  ipcMain.handle('studyhub:importInbox', (_evt, filename: string, data: VocabInboxFile) =>
    store.dropInboxFile(filename, data),
  );

  ipcMain.handle('studyhub:getQuizzes', () => ({ quizzes: store.listQuizzes() }));

  ipcMain.handle('studyhub:importQuiz', (_evt, filename: string, quiz: QuizFile) => {
    const saved = store.importQuiz(filename, quiz);
    return { quiz: saved, quizzes: store.listQuizzes() };
  });

  ipcMain.handle('studyhub:getResults', () => ({ results: store.listResults() }));

  ipcMain.handle('studyhub:saveResult', (_evt, filename: string, result: QuizResultFile) => ({
    result: store.saveQuizResult(filename, result),
  }));

  ipcMain.handle(
    'studyhub:lookup',
    (
      _evt,
      surface: string,
      options: { glossary?: Record<string, string>; matchedGlossaryKey?: string } = {},
    ) => store.lookup(surface, options),
  );

  ipcMain.handle('studyhub:importDictCsv', (_evt, filename: string, content: string) =>
    store.saveExternalDictCsv(filename, content),
  );
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'StudyHub',
    autoHideMenuBar: true,
    backgroundColor: '#F8FAFC',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 直接从本地文件加载构建好的界面（零 localhost、零端口）
  const indexHtmlPath = path.join(__dirname, '..', 'dist', 'index.html');
  await mainWindow.loadFile(indexHtmlPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 保证只启动一个客户端实例
const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpcHandlers();
    void createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
