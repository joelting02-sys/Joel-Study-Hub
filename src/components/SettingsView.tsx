/**
 * 设置页面
 * - 配置 StudyHub 本地数据目录（Windows 默认 C:\Users\joelt\Documents\StudyHub\）
 * - 查看数据文件夹实时概况（单词、测验、成绩、离线词典 ECDICT、exports/单词库.md）
 * - 支持直接导入 vocab_inbox JSON 测试自动合并并删除，以及导入完整 ecdict.csv
 * - 外观设置：浅色/深色模式、阅读字体大小
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  FolderOpen,
  FolderSearch,
  Inbox,
  Moon,
  RefreshCw,
  RotateCw,
  Sun,
  Upload,
} from 'lucide-react';
import type {
  AppPreferences,
  AppUpdateState,
  FolderStatus,
  FontScale,
  QuizResultFile,
} from '../types/studyhub';

interface SettingsViewProps {
  status: FolderStatus | null;
  results: QuizResultFile[];
  preferences: AppPreferences;
  isDesktopClient: boolean;
  updateState: AppUpdateState | null;
  onCheckForUpdates: () => Promise<void>;
  onDownloadUpdate: () => Promise<void>;
  onQuitAndInstall: () => Promise<{ ok: boolean }>;
  onOpenReleasesPage: () => Promise<{ ok: boolean; error?: string }>;
  onUpdatePreferences: (patch: Partial<AppPreferences>) => void;
  onChangeDataDir: (dir: string) => Promise<void>;
  onPickDataDir: () => Promise<void>;
  onOpenDataDir: () => Promise<{ ok: boolean; error?: string }>;
  onImportInbox: (filename: string, data: { words: unknown[] }) => Promise<number>;
  onImportDictCsv: (filename: string, content: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  status,
  results,
  preferences,
  isDesktopClient,
  updateState,
  onCheckForUpdates,
  onDownloadUpdate,
  onQuitAndInstall,
  onOpenReleasesPage,
  onUpdatePreferences,
  onChangeDataDir,
  onPickDataDir,
  onOpenDataDir,
  onImportInbox,
  onImportDictCsv,
}) => {
  const [dirInput, setDirInput] = useState(status?.dataDir || '');
  const [dirMsg, setDirMsg] = useState('');
  const [dirError, setDirError] = useState('');
  const [savingDir, setSavingDir] = useState(false);

  const [toolNotice, setToolNotice] = useState('');
  const [toolError, setToolError] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const inboxInputRef = useRef<HTMLInputElement | null>(null);
  const dictInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyAgentPrompt = async () => {
    const activeDir = status?.dataDir || status?.defaultWindowsDir || 'C:\\Users\\joelt\\Documents\\StudyHub';
    const guideFile = `${activeDir}${activeDir.includes('\\') ? '\\' : '/'}AGENT_GUIDE.md`;
    const handoffText = [
      '请作为我的 Joel Study Hub 本地学习 Agent，直接通过本地文件夹与 Joel Study Hub 桌面软件协作。',
      `数据根目录：${activeDir}`,
      `完整协议文档：请先读取 ${guideFile}，严格遵守里面的 JSON 格式与读写权限：`,
      '- 写入测验：写入 quizzes/<quiz_id>.json（先写 .tmp. 再 rename），软件实时监听自动刷新',
      '- 推荐生词：写入 vocab_inbox/<batch>.json，软件自动合并进 vocab.json 并删除该文件',
      '- 只读数据：读取 vocab.json、results/*.json、exports/单词库.md 来分析错题与高频查询词（禁止直接修改 vocab.json）',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(handoffText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      setToolError('无法访问系统剪贴板，请直接让 Agent 读取数据目录下的 AGENT_GUIDE.md');
    }
  };

  useEffect(() => {
    if (status?.dataDir) {
      setDirInput(status.dataDir);
    }
  }, [status?.dataDir]);

  const handleSaveDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirInput.trim()) return;
    setSavingDir(true);
    setDirMsg('');
    setDirError('');
    try {
      await onChangeDataDir(dirInput.trim());
      setDirMsg('数据文件夹路径已更新，并已重新启动文件监听。');
    } catch (err) {
      setDirError(err instanceof Error ? err.message : '路径修改失败');
    } finally {
      setSavingDir(false);
    }
  };

  const handleInboxFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setToolNotice('');
    setToolError('');
    try {
      const parsed = JSON.parse(await file.text());
      const addedCount = await onImportInbox(file.name, parsed);
      setToolNotice(
        `已写入 vocab_inbox/${file.name}，按 word 去重合并 ${addedCount} 个新词，并已自动删除原 inbox 文件。`,
      );
    } catch (err) {
      setToolError(err instanceof Error ? err.message : 'vocab_inbox JSON 解析失败');
    }
  };

  const handleDictCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setToolNotice('');
    setToolError('');
    try {
      const content = await file.text();
      await onImportDictCsv(file.name, content);
      setToolNotice(`离线词典 ${file.name} 已导入到 dict/ 并重载完成。`);
    } catch (err) {
      setToolError(err instanceof Error ? err.message : '词典 CSV 导入失败');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          设置与数据目录
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          所有学习数据均保存在本地 JSON / Markdown 文件中，方便外部 AI 私教与 Obsidian / Anki 共享读写
        </p>
      </div>

      {/* 软件更新（官方 electron-updater + GitHub Releases） */}
      <section
        data-testid="settings-updater-section"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              软件更新
            </h2>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              当前版本 v{updateState?.currentVersion || '1.0.0'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {updateState?.repoUrl && (
              <button
                type="button"
                onClick={() => void onOpenReleasesPage()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-4 w-4" />
                <span>GitHub Releases</span>
              </button>
            )}

            {updateState?.phase === 'available' ? (
              <button
                type="button"
                onClick={() => void onDownloadUpdate()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Download className="h-4 w-4" />
                <span>立即下载升级 (v{updateState.latestVersion})</span>
              </button>
            ) : updateState?.phase === 'downloaded' ? (
              <button
                type="button"
                onClick={() => void onQuitAndInstall()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <RotateCw className="h-4 w-4" />
                <span>立即重启并安装 v{updateState.latestVersion}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  !updateState?.supported ||
                  updateState.phase === 'checking' ||
                  updateState.phase === 'downloading'
                }
                onClick={() => void onCheckForUpdates()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <RefreshCw
                  className={`h-4 w-4 ${updateState?.phase === 'checking' ? 'animate-spin' : ''}`}
                />
                <span>
                  {updateState?.phase === 'checking'
                    ? '检查更新中…'
                    : updateState?.phase === 'downloading'
                      ? `下载中 ${updateState.percent ?? 0}%…`
                      : updateState?.phase === 'error'
                        ? '重新检查更新'
                        : '检查更新'}
                </span>
              </button>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {updateState?.message ||
            '通过 GitHub Releases（latest.yml + SHA-512 校验）检测新版本并直接下载升级，升级不会影响你的本地学习数据文件夹。'}
        </p>

        {updateState?.phase === 'downloading' && (
          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200 dark:bg-blue-500"
                style={{ width: `${Math.min(100, Math.max(0, updateState.percent ?? 0))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>
                {updateState.percent ?? 0}%
                {typeof updateState.transferred === 'number' &&
                  typeof updateState.total === 'number' &&
                  updateState.total > 0 && (
                    <>
                      {' · '}
                      {(updateState.transferred / (1024 * 1024)).toFixed(1)} /{' '}
                      {(updateState.total / (1024 * 1024)).toFixed(1)} MB
                    </>
                  )}
              </span>
              {typeof updateState.bytesPerSecond === 'number' && updateState.bytesPerSecond > 0 && (
                <span>{(updateState.bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 外观与字号 */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          界面外观与字号
        </h2>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">主题模式</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              夜间复习时可切换到低眩光深色模式
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onUpdatePreferences({ theme: 'light' })}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                preferences.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Sun className="h-4 w-4" />
              <span>浅色</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdatePreferences({ theme: 'dark' })}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                preferences.theme === 'dark'
                  ? 'bg-slate-900 text-slate-50 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Moon className="h-4 w-4" />
              <span>深色</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">英文字号</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              调整测验题干、选项与复习原句的字体大小
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-800">
            {(
              [
                ['normal', '标准'],
                ['large', '偏大'],
                ['xlarge', '超大'],
              ] as Array<[FontScale, string]>
            ).map(([scale, label]) => (
              <button
                key={scale}
                type="button"
                onClick={() => onUpdatePreferences({ fontScale: scale })}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  preferences.fontScale === scale
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 数据根目录配置 */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Joel Study Hub 数据文件夹
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isDesktopClient
              ? '运行模式：Windows 桌面客户端（原生 IPC，无 localhost）'
              : '运行模式：在线预览（下载至 Windows 启动桌面客户端后为纯本地 IPC）'}
          </span>
        </div>

        <form onSubmit={(e) => void handleSaveDir(e)} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="studyhub-data-dir"
              className="block text-xs text-slate-500 dark:text-slate-400"
            >
              当前目录路径（Windows 桌面版默认：
              <code className="ml-1 font-mono text-slate-700 dark:text-slate-300">
                {status?.defaultWindowsDir || 'C:\\Users\\joelt\\Documents\\StudyHub'}
              </code>
              ）
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="studyhub-data-dir"
                type="text"
                value={dirInput}
                onChange={(e) => setDirInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {isDesktopClient && (
                <>
                  <button
                    type="button"
                    onClick={() => void onPickDataDir()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <FolderSearch className="h-4 w-4" />
                    <span>浏览文件夹</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onOpenDataDir()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>打开目录</span>
                  </button>
                </>
              )}
              <button
                type="submit"
                disabled={savingDir}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {savingDir ? '保存中…' : '保存路径'}
              </button>
            </div>
          </div>
          {dirMsg && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{dirMsg}</p>
          )}
          {dirError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{dirError}</p>
          )}
        </form>

        {/* 文件夹实时状态概览 */}
        {status && (
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">vocab.json</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                {status.vocabCount} 词
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                学习中 {status.learningCount} · 已学会 {status.learnedCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">quizzes/</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                {status.quizCount} 套
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">实时监听中</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">results/</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                {status.resultCount} 份
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">测验结果记录</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">dict/ 离线词典</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                {status.ecdictEntriesCount} 词
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {status.hasExternalEcdict ? '已加载外部 ECDICT' : '内置核心 ECDICT'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 交给 Agent 直接使用 */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              交给 Agent 直接使用
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyAgentPrompt()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {copiedPrompt ? (
              <>
                <Check className="h-4 w-4" />
                <span>已复制接入指令</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>复制给 Agent 的接入指令</span>
              </>
            )}
          </button>
        </div>

        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          软件启动后会自动在数据目录生成 <span className="font-mono font-medium">AGENT_GUIDE.md</span>
          ，里面写明了全部目录路径、读写权限、原子写入规则以及 <span className="font-mono">quizzes/</span>、
          <span className="font-mono">vocab_inbox/</span>、<span className="font-mono">results/</span>、
          <span className="font-mono">vocab.json</span> 的精确格式。把上面的接入指令发给你的 Agent，它读完即可直接开始出题、推词和分析错题。
        </p>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 dark:border-slate-800">
          <div className="space-y-1 text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Agent 可写入目录</p>
            <p className="font-mono">quizzes/*.json → 新测验（实时自动刷新）</p>
            <p className="font-mono">vocab_inbox/*.json → 推荐单词（自动合并并删除）</p>
          </div>
          <div className="space-y-1 text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Agent 只读目录</p>
            <p className="font-mono">results/*.json → 每次测验成绩与查词记录</p>
            <p className="font-mono">vocab.json / exports/单词库.md → 单词库（禁止直接改写）</p>
          </div>
        </div>
      </section>

      {/* AI 私教接口与词典导入工具 */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            离线词典（ECDICT）与 vocab_inbox 导入
          </h2>
        </div>

        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          可将开源 <span className="font-mono">skywind3000/ECDICT</span> 的{' '}
          <span className="font-mono">ecdict.csv</span> 放入 <span className="font-mono">dict/</span>{' '}
          文件夹（或直接从下方导入）以扩展完整离线词库；也可直接测试导入{' '}
          <span className="font-mono">vocab_inbox/*.json</span> 自动去重合并并删除原文件。
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inboxInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => void handleInboxFile(e)}
          />
          <button
            type="button"
            onClick={() => inboxInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Inbox className="h-4 w-4" />
            <span>导入 vocab_inbox JSON</span>
          </button>

          <input
            ref={dictInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void handleDictCsv(e)}
          />
          <button
            type="button"
            onClick={() => dictInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            <span>导入 ECDICT (.csv)</span>
          </button>
        </div>

        {toolNotice && (
          <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toolNotice}</span>
          </p>
        )}
        {toolError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {toolError}
          </p>
        )}
      </section>

      {/* 最近测验结果记录 */}
      {results.length > 0 && (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            最近测验结果（results/）
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.slice(0, 8).map((r, idx) => (
              <div
                key={r._filename || idx}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{r.title}</p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {r._filename || r.quiz_id} · {r.finished_at.slice(0, 16).replace('T', ' ')}
                  </p>
                </div>
                <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {r.score}/{r.total} ({r.percent}%)
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
