/**
 * Joel Study Hub 纯原生 Electron 桌面端主进程源码（编译后输出到 electron/main.cjs）
 *
 * 架构特点（彻底告别 localhost）：
 * 1. 不启动 Express / HTTP 服务器，不占用任何 localhost 端口
 * 2. 通过 BrowserWindow.loadFile(dist/index.html) 直接离线加载前端界面
 * 3. 通过 Electron IPC (ipcMain.handle + webContents.send) 与界面双向通信
 * 4. 直接读写本地 C:\Users\<用户名>\Documents\StudyHub\，支持原生系统文件夹选择框与资源管理器打开
 * 5. 内置官方 electron-updater，通过 GitHub Releases (latest.yml + SHA-512 校验) 支持应用内一键检查、下载并重启升级
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import updaterPkg from 'electron-updater';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { StudyHubStorage, type StorageChangeEvent } from '../server/storage.ts';
import type {
  AppUpdateState,
  QuizFile,
  QuizResultFile,
  VocabInboxFile,
  VocabStatus,
} from '../src/types/studyhub.ts';

let mainWindow: BrowserWindow | null = null;
let storage: StudyHubStorage | null = null;
let updaterInitialized = false;

function getAutoUpdater() {
  return updaterPkg.autoUpdater;
}

function readRepoUrlFromAppUpdateYml(): { hasConfig: boolean; repoUrl?: string } {
  try {
    const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
    if (!resourcesPath) return { hasConfig: false };
    const ymlPath = path.join(resourcesPath, 'app-update.yml');
    if (!fs.existsSync(ymlPath)) return { hasConfig: false };
    const raw = fs.readFileSync(ymlPath, 'utf-8');
    const ownerMatch = raw.match(/^\s*owner:\s*['"]?([^\s'"#]+)['"]?/m);
    const repoMatch = raw.match(/^\s*repo:\s*['"]?([^\s'"#]+)['"]?/m);
    if (ownerMatch?.[1] && repoMatch?.[1]) {
      return {
        hasConfig: true,
        repoUrl: `https://github.com/${ownerMatch[1]}/${repoMatch[1]}/releases`,
      };
    }
    return { hasConfig: true };
  } catch {
    return { hasConfig: false };
  }
}

let updateState: AppUpdateState = {
  currentVersion: '1.0.0',
  isPackaged: false,
  isPortable: false,
  supported: false,
  phase: 'idle',
};

function emitUpdateState(patch: Partial<AppUpdateState>): AppUpdateState {
  updateState = { ...updateState, ...patch };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('studyhub:update-status', updateState);
  }
  return updateState;
}

function initAutoUpdater(): void {
  if (updaterInitialized) return;
  updaterInitialized = true;

  const isPackaged = Boolean(app.isPackaged);
  const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
  const { hasConfig, repoUrl } = readRepoUrlFromAppUpdateYml();
  const supported = isPackaged && !isPortable && hasConfig;

  let unsupportedMsg: string | undefined;
  if (!isPackaged) {
    unsupportedMsg = '当前为开发源码运行模式；通过 GitHub Releases 安装 Windows 安装版后即可在应用内一键升级。';
  } else if (isPortable) {
    unsupportedMsg = '便携版（Portable）不支持原地自动覆盖升级，请使用安装版（Setup.exe）或前往 GitHub Releases 下载新版。';
  } else if (!hasConfig) {
    unsupportedMsg = '当前安装包未包含 GitHub Releases 更新配置（app-update.yml），请通过 GitHub Actions 发布的安装版进行自动升级。';
  }

  updateState = {
    currentVersion: app.getVersion(),
    isPackaged,
    isPortable,
    supported,
    phase: supported ? 'idle' : 'unsupported',
    message: unsupportedMsg,
    repoUrl,
  };

  if (!supported) return;

  const autoUpdater = getAutoUpdater();

  // 官方标准交互：先检查并展示版本号，由用户点击确认后再下载，下载完成后由用户点重启安装
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;

  autoUpdater.on('checking-for-update', () => {
    emitUpdateState({
      phase: 'checking',
      percent: undefined,
      transferred: undefined,
      total: undefined,
      bytesPerSecond: undefined,
      message: '正在连接 GitHub Releases 检查最新版本…',
    });
  });

  autoUpdater.on('update-available', (info) => {
    emitUpdateState({
      phase: 'available',
      latestVersion: info.version,
      message: `发现新版本 v${info.version}，点击下方按钮即可直接下载并升级。`,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    emitUpdateState({
      phase: 'not-available',
      latestVersion: info.version,
      message: `当前已是最新版本 (v${app.getVersion()})。`,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    emitUpdateState({
      phase: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
      message: `正在下载更新包 (${Math.round(progress.percent)}%)…`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    emitUpdateState({
      phase: 'downloaded',
      latestVersion: info.version,
      percent: 100,
      message: `v${info.version} 已下载并完成 SHA-512 校验，点击「立即重启并安装」完成升级。`,
    });
  });

  autoUpdater.on('error', (err) => {
    const rawMsg = err instanceof Error ? err.message : String(err);
    emitUpdateState({
      phase: 'error',
      message: `检查或下载更新失败：${rawMsg}`,
    });
  });
}

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
  initAutoUpdater();

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

  // ==================== 官方 electron-updater GitHub Releases 升级 ====================

  ipcMain.handle('studyhub:getUpdateState', () => updateState);

  ipcMain.handle('studyhub:checkForUpdates', async () => {
    if (!updateState.supported) {
      return updateState;
    }
    if (updateState.phase === 'checking' || updateState.phase === 'downloading') {
      return updateState;
    }
    try {
      emitUpdateState({
        phase: 'checking',
        message: '正在连接 GitHub Releases 检查最新版本…',
      });
      await getAutoUpdater().checkForUpdates();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitUpdateState({ phase: 'error', message: `检查更新失败：${msg}` });
    }
    return updateState;
  });

  ipcMain.handle('studyhub:downloadUpdate', async () => {
    if (!updateState.supported) {
      return updateState;
    }
    if (updateState.phase === 'downloading') {
      return updateState;
    }
    try {
      emitUpdateState({
        phase: 'downloading',
        percent: 0,
        transferred: 0,
        total: 0,
        bytesPerSecond: 0,
        message: '正在从 GitHub Releases 下载更新包…',
      });
      await getAutoUpdater().downloadUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitUpdateState({ phase: 'error', message: `下载更新失败：${msg}` });
    }
    return updateState;
  });

  ipcMain.handle('studyhub:quitAndInstall', () => {
    if (!updateState.supported || updateState.phase !== 'downloaded') {
      return { ok: false };
    }
    setImmediate(() => {
      getAutoUpdater().quitAndInstall(false, true);
    });
    return { ok: true };
  });

  ipcMain.handle('studyhub:openReleasesPage', async () => {
    const url = updateState.repoUrl;
    if (!url || !url.startsWith('https://github.com/')) {
      return { ok: false, error: '未配置 GitHub Releases 仓库地址' };
    }
    await shell.openExternal(url);
    return { ok: true };
  });
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Joel Study Hub',
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
