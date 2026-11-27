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
  Eye,
  EyeOff,
  FolderOpen,
  FolderSearch,
  Inbox,
  Languages,
  Loader2,
  Moon,
  RefreshCw,
  RotateCw,
  Search,
  Sparkles,
  Sun,
  Upload,
} from 'lucide-react';
import type {
  AppPreferences,
  AppUpdateState,
  FetchModelsInput,
  FetchModelsResult,
  FolderStatus,
  FontScale,
  LookupResult,
  QuizResultFile,
  SaveTranslationConfigInput,
  SpeechAccent,
  SpeechEngine,
  SpeechRate,
  TranslationApiStatus,
  TranslationMode,
  WordLookupTrigger,
} from '../types/studyhub';
import { extractErrorMessage } from '../lib/errors';
import { formatPhoneticDisplay, isDedicatedTranslationModel, pickPreferredChatModel } from '../lib/lookupHelpers';
import { speakWord } from '../lib/speech';
import { WordSpeakButton } from './WordSpeakButton';

const DOUBAO_DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DOUBAO_DEFAULT_MODEL = 'doubao-seed-translation-250915';

interface SettingsViewProps {
  status: FolderStatus | null;
  translationStatus: TranslationApiStatus | null;
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
  onSaveTranslationConfig: (input: SaveTranslationConfigInput) => Promise<TranslationApiStatus>;
  onFetchTranslationModels: (input: FetchModelsInput) => Promise<FetchModelsResult>;
  onTestTranslate: (payload: { surface: string; sentence?: string }) => Promise<LookupResult>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  status,
  translationStatus,
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
  onSaveTranslationConfig,
  onFetchTranslationModels,
  onTestTranslate,
}) => {
  const [dirInput, setDirInput] = useState(status?.dataDir || '');
  const [dirMsg, setDirMsg] = useState('');
  const [dirError, setDirError] = useState('');
  const [savingDir, setSavingDir] = useState(false);

  const [toolNotice, setToolNotice] = useState('');
  const [toolError, setToolError] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // 翻译模型精简配置（仅 Base URL + API Key + 自动侦测模型选择）
  const [baseUrlInput, setBaseUrlInput] = useState(translationStatus?.baseUrl || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelInput, setModelInput] = useState(translationStatus?.model || '');
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [detectingModels, setDetectingModels] = useState(false);
  const [detectNote, setDetectNote] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [configError, setConfigError] = useState('');

  const [testingTranslate, setTestingTranslate] = useState(false);
  const [testResult, setTestResult] = useState<LookupResult | null>(null);

  const inboxInputRef = useRef<HTMLInputElement | null>(null);
  const dictInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (translationStatus) {
      setBaseUrlInput((prev) => (prev ? prev : translationStatus.baseUrl || ''));
      setModelInput((prev) => (prev ? prev : translationStatus.model || ''));
    }
  }, [translationStatus]);

  const handleApplyDoubaoPreset = () => {
    setBaseUrlInput(DOUBAO_DEFAULT_BASE_URL);
    if (!modelInput.trim()) {
      setModelInput(DOUBAO_DEFAULT_MODEL);
    }
    setConfigError('');
    setConfigMsg('已填入豆包火山方舟默认地址与翻译模型，粘贴 API Key 后即可侦测或保存。');
  };

  const handleDetectModels = async () => {
    setDetectingModels(true);
    setConfigError('');
    setConfigMsg('');
    setDetectNote('');
    try {
      const res = await onFetchTranslationModels({
        baseUrl: baseUrlInput.trim(),
        apiKey: apiKeyInput.trim() || undefined,
      });
      setDetectedModels(res.models);
      if (res.models.length > 0) {
        setCustomModelMode(false);
        setModelInput((prev) => {
          if (prev.trim()) return prev;
          return pickPreferredChatModel(res.models) || res.models[0];
        });
      }
      if (res.note) {
        setDetectNote(res.note);
      } else {
        setDetectNote(`已自动侦测到 ${res.count} 个可用模型，请在下方直接选择。`);
      }
    } catch (err) {
      setConfigError(extractErrorMessage(err, '侦测可用模型失败'));
    } finally {
      setDetectingModels(false);
    }
  };

  const handleSaveTranslationConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setConfigError('');
    setConfigMsg('');
    setTestResult(null);
    try {
      const next = await onSaveTranslationConfig({
        baseUrl: baseUrlInput.trim(),
        apiKey: apiKeyInput.trim() || undefined,
        model: modelInput.trim(),
      });
      setBaseUrlInput(next.baseUrl);
      setModelInput(next.model);
      setApiKeyInput('');
      setConfigMsg(
        next.configured
          ? `配置已保存（${next.endpointHost} · ${next.model}）`
          : '配置已保存，请补全 Base URL 与模型名称以启用接口。',
      );
      return next;
    } catch (err) {
      setConfigError(extractErrorMessage(err, '保存翻译配置失败'));
      return null;
    } finally {
      setSavingConfig(false);
    }
  };

  const handleClearApiKey = async () => {
    setSavingConfig(true);
    setConfigError('');
    setConfigMsg('');
    try {
      await onSaveTranslationConfig({
        baseUrl: baseUrlInput.trim(),
        model: modelInput.trim(),
        clearApiKey: true,
      });
      setApiKeyInput('');
      setConfigMsg('已清除已保存的 API Key。');
    } catch (err) {
      setConfigError(extractErrorMessage(err, '清除 API Key 失败'));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleQuickTestTranslate = async () => {
    setTestingTranslate(true);
    setTestResult(null);
    setConfigError('');
    try {
      // 如果表单里有未保存改动，先保存再测试，避免测到旧配置
      const hasPendingChanges =
        baseUrlInput.trim() !== (translationStatus?.baseUrl || '') ||
        modelInput.trim() !== (translationStatus?.model || '') ||
        apiKeyInput.trim().length > 0;
      if (hasPendingChanges) {
        const saved = await onSaveTranslationConfig({
          baseUrl: baseUrlInput.trim(),
          apiKey: apiKeyInput.trim() || undefined,
          model: modelInput.trim(),
        });
        setBaseUrlInput(saved.baseUrl);
        setModelInput(saved.model);
        setApiKeyInput('');
      }
      const res = await onTestTranslate({
        surface: 'amortization',
        sentence: 'The company spreads intangible asset costs through annual amortization.',
      });
      setTestResult(res);
    } catch (err) {
      setConfigError(extractErrorMessage(err, '测试翻译失败'));
    } finally {
      setTestingTranslate(false);
    }
  };

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
      setDirError(extractErrorMessage(err, '路径修改失败'));
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
      setToolError(extractErrorMessage(err, 'vocab_inbox JSON 解析失败'));
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
      setToolError(extractErrorMessage(err, '词典 CSV 导入失败'));
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

      {/* 软件更新（Rust 原生直连 GitHub Releases + SHA-256 校验） */}
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
              当前版本 v{updateState?.currentVersion || '1.0.11'}
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
            '直连 GitHub Releases（免密钥 + SHA-256 完整性校验）检测新版本并启动安装升级，升级不会影响你的本地学习数据文件夹。'}
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

        <div className="flex flex-col gap-5 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">查词触发方式</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              设置鼠标指到英文单词时自动显示翻译，还是需要点击单词后再显示
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-800">
            {(
              [
                ['hover', '指到自动翻译'],
                ['click', '仅点击显示'],
              ] as Array<[WordLookupTrigger, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdatePreferences({ wordLookupTrigger: mode })}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  preferences.wordLookupTrigger === mode
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

      {/* 单词朗读选项（默认静默，仅在你点击小播放键时朗读） */}
      <section
        data-testid="settings-speech-section"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              单词朗读选项
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              默认保持静默，仅在你主动点击单词旁的小播放键时朗读
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WordSpeakButton
              text="entrepreneurship"
              accent={preferences.speechAccent}
              rate={preferences.speechRate}
              engine={preferences.speechEngine}
              size="sm"
              title="试听 entrepreneurship"
            />
            <button
              type="button"
              onClick={() =>
                void speakWord('entrepreneurship', {
                  accent: preferences.speechAccent,
                  rate: preferences.speechRate,
                  engine: preferences.speechEngine,
                })
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              试听 (entrepreneurship)
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">发音口音</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              在弹窗和单词库中点击小播放键时的默认口音
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-800">
            {(
              [
                ['en-US', '美式 (en-US)'],
                ['en-GB', '英式 (en-GB)'],
              ] as Array<[SpeechAccent, string]>
            ).map(([accent, label]) => (
              <button
                key={accent}
                type="button"
                onClick={() => onUpdatePreferences({ speechAccent: accent })}
                className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  preferences.speechAccent === accent
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">朗读语速</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              遇到长难词时可调慢语速听清每个音节
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-800">
            {(
              [
                [0.75, '0.75x 慢速'],
                [0.85, '0.85x 较慢'],
                [1, '1.0x 正常'],
                [1.15, '1.15x 较快'],
              ] as Array<[SpeechRate, string]>
            ).map(([rate, label]) => (
              <button
                key={rate}
                type="button"
                onClick={() => onUpdatePreferences({ speechRate: rate })}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  preferences.speechRate === rate
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">发音引擎</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              在线词典发音会自动缓存到本地，断网时自动无缝切换到系统语音
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-800">
            {(
              [
                ['online_cached', '在线词典（本地缓存+离线兜底）'],
                ['offline_only', '仅离线系统语音'],
              ] as Array<[SpeechEngine, string]>
            ).map(([engine, label]) => (
              <button
                key={engine}
                type="button"
                onClick={() => onUpdatePreferences({ speechEngine: engine })}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  preferences.speechEngine === engine
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

      {/* 翻译模型设置（精简：Base URL + API Key + 自动侦测模型） */}
      <section
        data-testid="settings-translation-api-section"
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C31]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              翻译模型接口
            </h2>
          </div>

          <span
            className={`text-xs font-semibold ${
              translationStatus?.configured
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {translationStatus?.configured
              ? `已连接 · ${translationStatus.endpointHost} · ${translationStatus.model}`
              : '未配置（仅使用离线词典）'}
          </span>
        </div>

        <form onSubmit={(e) => void handleSaveTranslationConfig(e)} className="space-y-4">
          {/* Base URL */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="translate-base-url"
                className="text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Base URL
              </label>
              <button
                type="button"
                onClick={handleApplyDoubaoPreset}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>填入豆包默认地址</span>
              </button>
            </div>
            <input
              id="translate-base-url"
              type="url"
              value={baseUrlInput}
              onChange={(e) => setBaseUrlInput(e.target.value)}
              placeholder="https://ark.cn-beijing.volces.com/api/v3 或 http://127.0.0.1:3425/v1"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="translate-api-key"
                className="text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                API Key
              </label>
              {translationStatus?.hasApiKey && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    已保存 ({translationStatus.apiKeyPreview})
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleClearApiKey()}
                    className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                  >
                    清除
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <input
                id="translate-api-key"
                type={showApiKey ? 'text' : 'password'}
                autoComplete="off"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={
                  translationStatus?.hasApiKey
                    ? '已安全保存在本地后端，留空保持不变'
                    : '粘贴你的豆包 / API Key'
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pr-10 pl-3.5 font-mono text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                aria-label={showApiKey ? '隐藏密钥' : '显示密钥'}
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 选择模型（支持一键侦测该 API 下的所有模型） */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="translate-model-select"
                className="text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                选择模型
                {detectedModels.length > 0 && (
                  <span className="ml-2 font-mono text-xs font-normal text-slate-500 dark:text-slate-400">
                    (已侦测 {detectedModels.length} 个)
                  </span>
                )}
              </label>
              {detectedModels.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCustomModelMode((v) => !v)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {customModelMode ? '切回下拉列表' : '手动输入模型 ID'}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {detectedModels.length > 0 && !customModelMode ? (
                <select
                  id="translate-model-select"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {!modelInput && <option value="">请选择一个模型…</option>}
                  {modelInput && !detectedModels.includes(modelInput) && (
                    <option value={modelInput}>{modelInput}（当前）</option>
                  )}
                  {detectedModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="translate-model-select"
                  type="text"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  placeholder="点击右侧「侦测模型」，或直接填 doubao-seed-translation-250915"
                  className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              )}

              <button
                type="button"
                disabled={detectingModels || !baseUrlInput.trim()}
                onClick={() => void handleDetectModels()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {detectingModels ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>侦测中…</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>侦测模型</span>
                  </>
                )}
              </button>
            </div>

            {detectNote && (
              <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-400">
                {detectNote}
              </p>
            )}

            {isDedicatedTranslationModel(modelInput) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
                <p>
                  提示：「<span className="font-mono">{modelInput}</span>」属于纯直译通道，每次仅输出单个固定译文（如 stakeholder → 利益相关者）。如果要像 Trae 对话模型那样同时显示<strong>多种说法、大白话解释（如「股东」）和英文同义词</strong>，请改选快速对话模型（如 <span className="font-mono">auto/deepseek-v4.1-flash</span>，约 1.5 秒响应；不建议默认用强制深度思考的 <span className="font-mono">auto/hy4flash-free</span>）。
                </p>
                {(() => {
                  const suggested = pickPreferredChatModel(detectedModels);
                  if (!suggested) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setModelInput(suggested)}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
                    >
                      一键切换为 {suggested}
                    </button>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 保存与一键测试 */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {savingConfig ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>保存中…</span>
                </>
              ) : (
                <span>保存配置</span>
              )}
            </button>

            <button
              type="button"
              disabled={testingTranslate || !baseUrlInput.trim() || !modelInput.trim()}
              onClick={() => void handleQuickTestTranslate()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {testingTranslate ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>测试翻译中…</span>
                </>
              ) : (
                <span>测试翻译（amortization）</span>
              )}
            </button>
          </div>

          {configMsg && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {configMsg}
            </p>
          )}
          {configError ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {configError}
            </p>
          ) : (
            !configMsg &&
            !detectNote &&
            translationStatus?.error && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                {translationStatus.error}
              </p>
            )
          )}
          {testResult && (
            <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div>
                <span className="font-semibold">测试成功：</span>
                <span className="font-bold">{testResult.word}</span>
                {formatPhoneticDisplay(testResult.phonetic) && (
                  <span className="ml-2 font-mono text-xs">
                    {formatPhoneticDisplay(testResult.phonetic)}
                  </span>
                )}
                {testResult.pos && <span className="ml-2 text-xs">{testResult.pos}</span>}
                <span className="ml-2">— {testResult.meaning_zh}</span>
              </div>
              {testResult.plain_zh && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  通俗说法：{testResult.plain_zh}
                </p>
              )}
              {testResult.alternatives && testResult.alternatives.length > 0 && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  不同说法：{testResult.alternatives.join(' · ')}
                </p>
              )}
              {testResult.synonyms && testResult.synonyms.length > 0 && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  英文同义词：{testResult.synonyms.join(' · ')}
                </p>
              )}
            </div>
          )}
        </form>

        {/* 触发策略与自动入库 */}
        <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                点击单词时的翻译方式
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                在测验、复习和单词库中点词时按所选策略调用；常见虚词自动秒出本地释义，AI 结果跨重启本地缓存
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit dark:bg-slate-800">
              {(
                [
                  ['auto_fallback', '词典未收录时自动调用'],
                  ['always_api', '优先用翻译模型'],
                  ['manual', '仅手动点击'],
                ] as Array<[TranslationMode, string]>
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdatePreferences({ translationMode: mode })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    preferences.translationMode === mode
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-50'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                翻译成功后自动加入单词库
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                开启后，翻译出中文释义会自动连同原句写入 vocab.json，无需再点一次加入
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="翻译成功后自动加入单词库"
              aria-checked={preferences.autoAddTranslatedVocab}
              onClick={() =>
                onUpdatePreferences({
                  autoAddTranslatedVocab: !preferences.autoAddTranslatedVocab,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                preferences.autoAddTranslatedVocab
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                  preferences.autoAddTranslatedVocab ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              />
            </button>
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
              ? '运行模式：Windows 桌面客户端（Tauri v2 + Rust 原生 IPC，无 localhost）'
              : '运行模式：在线预览（安装 Windows 客户端后为纯本地 Rust IPC）'}
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
