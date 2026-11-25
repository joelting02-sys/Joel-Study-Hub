/**
 * StudyHub 主应用入口
 * - 左侧固定导航：测验 / 阅读 / 单词库 / 复习 / 设置
 * - 全局点词翻译弹窗（WordLookupPopover）
 * - 通过 SSE (/api/events) 实时响应 quizzes/ 和 vocab_inbox/ 文件变更，无需重启
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardCheck,
  Layers,
  Library,
  Menu,
  Moon,
  MousePointerClick,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import type {
  AppPreferences,
  AppUpdateState,
  FetchModelsInput,
  FolderStatus,
  LookupResult,
  QuizFile,
  QuizResultFile,
  SaveTranslationConfigInput,
  TranslationApiStatus,
  VocabEntry,
  VocabStatus,
} from './types/studyhub';
import { studyhubApi } from './api/studyhubApi';
import { extractErrorMessage } from './lib/errors';
import { formatDateYmd, getDueReviewWords, normalizeWordKey } from './lib/vocabLogic';
import { mergeLookupEnrichment } from './lib/lookupHelpers';
import {
  WordLookupBehaviorContext,
  type WordClickPayload,
} from './components/InteractiveText';
import {
  WordLookupPopover,
  type ActiveLookupState,
} from './components/WordLookupPopover';
import { QuizView } from './components/QuizView';
import { VocabView } from './components/VocabView';
import { ReviewView } from './components/ReviewView';
import { SettingsView } from './components/SettingsView';

type NavTab = 'quiz' | 'vocab' | 'review' | 'settings';

const PREFS_STORAGE_KEY = 'studyhub_preferences_v1';

function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
        fontScale:
          parsed.fontScale === 'large' || parsed.fontScale === 'xlarge'
            ? parsed.fontScale
            : 'normal',
        translationMode:
          parsed.translationMode === 'always_api' || parsed.translationMode === 'manual'
            ? parsed.translationMode
            : 'auto_fallback',
        autoAddTranslatedVocab: Boolean(parsed.autoAddTranslatedVocab),
        wordLookupTrigger: parsed.wordLookupTrigger === 'click' ? 'click' : 'hover',
      };
    }
  } catch {
    // 忽略本地存储读取异常
  }
  return {
    theme: 'light',
    fontScale: 'normal',
    translationMode: 'auto_fallback',
    autoAddTranslatedVocab: false,
    wordLookupTrigger: 'hover',
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('quiz');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [preferences, setPreferences] = useState<AppPreferences>(loadPreferences);
  const [words, setWords] = useState<VocabEntry[]>([]);
  const [quizzes, setQuizzes] = useState<QuizFile[]>([]);
  const [results, setResults] = useState<QuizResultFile[]>([]);
  const [folderStatus, setFolderStatus] = useState<FolderStatus | null>(null);
  const [translationStatus, setTranslationStatus] = useState<TranslationApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [liveBanner, setLiveBanner] = useState<string>('');
  const [updateState, setUpdateState] = useState<AppUpdateState | null>(null);

  const [activeLookup, setActiveLookup] = useState<ActiveLookupState | null>(null);
  const activeLookupRef = useRef<ActiveLookupState | null>(null);
  activeLookupRef.current = activeLookup;
  const lookupSeqRef = useRef(0);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const recentHoverCountsRef = useRef<Map<string, number>>(new Map());
  const apiTranslateCacheRef = useRef<Map<string, LookupResult>>(new Map());

  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimerRef.current !== null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    cancelHoverClose();
    hoverCloseTimerRef.current = window.setTimeout(() => {
      hoverCloseTimerRef.current = null;
      setActiveLookup((prev) => (prev?.openedBy === 'hover' ? null : prev));
    }, 260);
  }, [cancelHoverClose]);

  useEffect(() => cancelHoverClose, [cancelHoverClose]);

  // 同步深色模式到 <html>
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // 忽略存储配额异常
    }
  }, [preferences]);

  const updatePreferences = useCallback((patch: Partial<AppPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSaveTranslationConfig = useCallback(async (input: SaveTranslationConfigInput) => {
    const next = await studyhubApi.saveTranslationConfig(input);
    setTranslationStatus(next);
    return next;
  }, []);

  const handleFetchTranslationModels = useCallback((input: FetchModelsInput) => {
    return studyhubApi.fetchTranslationModels(input);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoadError('');
    try {
      const [vocabRes, quizRes, resultRes, statusRes, tStatus] = await Promise.all([
        studyhubApi.getVocab(),
        studyhubApi.getQuizzes(),
        studyhubApi.getResults(),
        studyhubApi.getStatus(),
        studyhubApi.getTranslationStatus(),
      ]);
      setWords(vocabRes.words);
      setQuizzes(quizRes.quizzes);
      setResults(resultRes.results);
      setFolderStatus(statusRes);
      setTranslationStatus(tStatus);
    } catch (err) {
      setLoadError(extractErrorMessage(err, '加载本地学习数据失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载与实时文件监听（Electron 客户端走原生 IPC；网页预览走 SSE）
  useEffect(() => {
    void refreshAll();

    const unsubEvents = studyhubApi.subscribeEvents((data) => {
      if (data.type === 'quizzes_updated') {
        void studyhubApi.getQuizzes().then((r) => setQuizzes(r.quizzes)).catch(() => {});
        void studyhubApi.getStatus().then(setFolderStatus).catch(() => {});
      } else if (data.type === 'vocab_updated' || data.type === 'inbox_merged') {
        void studyhubApi.getVocab().then((r) => setWords(r.words)).catch(() => {});
        void studyhubApi.getStatus().then(setFolderStatus).catch(() => {});
      } else if (data.type === 'results_updated') {
        void studyhubApi.getResults().then((r) => setResults(r.results)).catch(() => {});
        void studyhubApi.getStatus().then(setFolderStatus).catch(() => {});
      } else if (data.type === 'dict_updated') {
        void studyhubApi.getStatus().then(setFolderStatus).catch(() => {});
      }

      if (data.message) {
        setLiveBanner(data.message);
      }
    });

    void studyhubApi.getUpdateState().then(setUpdateState).catch(() => {});
    const unsubUpdate = studyhubApi.subscribeUpdateStatus(setUpdateState);

    return () => {
      unsubEvents();
      unsubUpdate();
    };
  }, [refreshAll]);

  // 自动淡出文件同步提示条
  useEffect(() => {
    if (!liveBanner) return;
    const t = setTimeout(() => setLiveBanner(''), 4500);
    return () => clearTimeout(t);
  }, [liveBanner]);

  // 建立词库快速索引，供点词卡片和高亮使用
  const vocabLookupMap = useMemo(() => {
    const map = new Map<string, VocabEntry>();
    for (const w of words) {
      map.set(normalizeWordKey(w.word), w);
    }
    return map;
  }, [words]);

  const dueReviewCount = useMemo(
    () => getDueReviewWords(words, formatDateYmd()).length,
    [words],
  );
  const learningCount = useMemo(
    () => words.filter((w) => w.status === 'learning').length,
    [words],
  );

  const handleAddVocab = useCallback(
    async (payload: {
      word: string;
      meaning_zh: string;
      phonetic: string;
      pos: string;
      context: string;
      source: string;
      subject: string;
    }) => {
      const res = await studyhubApi.addVocab(payload);
      setWords(res.vocab.words);
      void studyhubApi.getStatus().then(setFolderStatus);
    },
    [],
  );

  // 悬停或点击英文单词：先查本地词典，按设置自动调用翻译模型接口，并支持自动加入单词库
  const handleWordClick = useCallback(
    async (payload: WordClickPayload) => {
      cancelHoverClose();
      const trigger = payload.trigger ?? 'click';
      const triggerKey = `${payload.surface}|${payload.source}|${Math.round(payload.anchorRect.left)}|${Math.round(payload.anchorRect.top)}`;
      if (trigger === 'hover' && activeLookupRef.current?.triggerKey === triggerKey) {
        return;
      }

      const seq = ++lookupSeqRef.current;
      setActiveLookup({
        loading: true,
        translatingApi: false,
        apiError: '',
        autoSaved: false,
        openedBy: trigger,
        triggerKey,
        result: null,
        sentence: payload.sentence,
        source: payload.source,
        subject: payload.subject,
        anchorRect: payload.anchorRect,
      });

      let result = await studyhubApi.lookup(payload.surface, {
        glossary: payload.glossary,
        matchedGlossaryKey: payload.matchedGlossaryKey,
      });

      if (lookupSeqRef.current !== seq) return;

      // 若本地词典未命中但单词库已有释义，优先回显已存释义
      const existingBeforeApi =
        vocabLookupMap.get(normalizeWordKey(result.word)) ||
        vocabLookupMap.get(normalizeWordKey(payload.surface));
      if (!result.found && existingBeforeApi && existingBeforeApi.meaning_zh.trim()) {
        result = {
          ...result,
          word: existingBeforeApi.word,
          phonetic: existingBeforeApi.phonetic || result.phonetic,
          pos: existingBeforeApi.pos || result.pos,
          meaning_zh: existingBeforeApi.meaning_zh,
          found: true,
        };
      }

      const apiConfigured = Boolean(translationStatus?.configured);
      const cacheKey = `${translationStatus?.model || ''}|${(payload.matchedGlossaryKey || payload.surface).trim().toLowerCase()}|${payload.sentence.trim()}`;
      const cachedApi = apiConfigured ? apiTranslateCacheRef.current.get(cacheKey) : undefined;
      if (cachedApi && (preferences.translationMode === 'always_api' || (preferences.translationMode === 'auto_fallback' && !result.found))) {
        const mergedCached = mergeLookupEnrichment(result, cachedApi);
        setActiveLookup((prev) =>
          prev
            ? {
                ...prev,
                loading: false,
                translatingApi: false,
                result: mergedCached,
              }
            : null,
        );
        return;
      }

      const shouldCallApi =
        apiConfigured &&
        (preferences.translationMode === 'always_api' ||
          (preferences.translationMode === 'auto_fallback' && !result.found));

      setActiveLookup((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              translatingApi: shouldCallApi,
              result,
            }
          : null,
      );

      let finalResult = result;
      let autoSaved = false;

      if (shouldCallApi) {
        try {
          const rawApiResult = await studyhubApi.translateWord({
            surface: payload.matchedGlossaryKey || payload.surface,
            sentence: payload.sentence,
            subject: payload.subject,
          });
          if (lookupSeqRef.current !== seq) return;
          if (apiTranslateCacheRef.current.size >= 300) {
            const firstKey = apiTranslateCacheRef.current.keys().next().value;
            if (firstKey) apiTranslateCacheRef.current.delete(firstKey);
          }
          apiTranslateCacheRef.current.set(cacheKey, rawApiResult);
          const apiResult = mergeLookupEnrichment(result, rawApiResult);
          finalResult = apiResult;

          const alreadyInVocab = vocabLookupMap.get(normalizeWordKey(apiResult.word));
          if (preferences.autoAddTranslatedVocab && !alreadyInVocab && apiResult.meaning_zh.trim()) {
            try {
              const saved = await studyhubApi.addVocab({
                word: apiResult.word,
                meaning_zh: apiResult.meaning_zh,
                phonetic: apiResult.phonetic || '',
                pos: apiResult.pos || '',
                context: payload.sentence,
                source: payload.source,
                subject: payload.subject,
              });
              setWords(saved.vocab.words);
              void studyhubApi.getStatus().then(setFolderStatus);
              autoSaved = true;
            } catch {
              // 自动入库失败时仍保留翻译展示，允许用户手动点击加入
            }
          }

          if (lookupSeqRef.current !== seq) return;
          setActiveLookup((prev) =>
            prev
              ? {
                  ...prev,
                  translatingApi: false,
                  apiError: '',
                  autoSaved,
                  result: apiResult,
                }
              : null,
          );
        } catch (err) {
          if (lookupSeqRef.current !== seq) return;
          setActiveLookup((prev) =>
            prev
              ? {
                  ...prev,
                  translatingApi: false,
                  apiError: extractErrorMessage(err, '调用翻译接口失败'),
                }
              : null,
          );
        }
      }

      // 若该词已在单词库，查意思时自动把 lookup_count + 1（悬停模式 30 秒内同一词条仅计一次）
      const existing = vocabLookupMap.get(normalizeWordKey(finalResult.word));
      if (existing && !autoSaved) {
        const hoverCountKey = `${normalizeWordKey(existing.word)}|${payload.source}`;
        const now = Date.now();
        const lastHoverCountAt = recentHoverCountsRef.current.get(hoverCountKey) ?? 0;
        const shouldCount = trigger === 'click' || now - lastHoverCountAt > 30_000;
        if (shouldCount) {
          if (trigger === 'hover') {
            recentHoverCountsRef.current.set(hoverCountKey, now);
          }
          try {
            const updated = await studyhubApi.addVocab({
              word: existing.word,
              meaning_zh: existing.meaning_zh || finalResult.meaning_zh,
              phonetic: existing.phonetic || finalResult.phonetic,
              pos: existing.pos || finalResult.pos,
              context: payload.sentence,
              source: payload.source,
              subject: payload.subject,
            });
            setWords(updated.vocab.words);
          } catch {
            // 忽略后台计数失败，不影响展示
          }
        }
      }
    },
    [
      cancelHoverClose,
      vocabLookupMap,
      translationStatus?.configured,
      translationStatus?.model,
      preferences.translationMode,
      preferences.autoAddTranslatedVocab,
    ],
  );

  // 在弹窗中手动触发「AI 多义词/重译」
  const handleRequestApiTranslate = useCallback(async () => {
    if (!activeLookup?.result) return;
    const seq = lookupSeqRef.current;
    const baseResult = activeLookup.result;
    const targetSurface = baseResult.surface || baseResult.word;
    setActiveLookup((prev) =>
      prev ? { ...prev, translatingApi: true, apiError: '', autoSaved: false } : null,
    );
    try {
      const rawApiResult = await studyhubApi.translateWord({
        surface: targetSurface,
        sentence: activeLookup.sentence,
        subject: activeLookup.subject,
      });
      if (lookupSeqRef.current !== seq) return;
      const cacheKey = `${translationStatus?.model || ''}|${targetSurface.trim().toLowerCase()}|${activeLookup.sentence.trim()}`;
      apiTranslateCacheRef.current.set(cacheKey, rawApiResult);
      const apiResult = mergeLookupEnrichment(baseResult, rawApiResult);

      let autoSaved = false;
      const alreadyInVocab = vocabLookupMap.get(normalizeWordKey(apiResult.word));
      if (preferences.autoAddTranslatedVocab && !alreadyInVocab && apiResult.meaning_zh.trim()) {
        try {
          const saved = await studyhubApi.addVocab({
            word: apiResult.word,
            meaning_zh: apiResult.meaning_zh,
            phonetic: apiResult.phonetic || '',
            pos: apiResult.pos || '',
            context: activeLookup.sentence,
            source: activeLookup.source,
            subject: activeLookup.subject,
          });
          setWords(saved.vocab.words);
          void studyhubApi.getStatus().then(setFolderStatus);
          autoSaved = true;
        } catch {
          // 忽略自动入库失败
        }
      }

      setActiveLookup((prev) =>
        prev
          ? {
              ...prev,
              translatingApi: false,
              apiError: '',
              autoSaved,
              result: apiResult,
            }
          : null,
      );
    } catch (err) {
      if (lookupSeqRef.current !== seq) return;
      setActiveLookup((prev) =>
        prev
          ? {
              ...prev,
              translatingApi: false,
              apiError: extractErrorMessage(err, '调用翻译接口失败'),
            }
          : null,
      );
    }
  }, [activeLookup, vocabLookupMap, translationStatus?.model, preferences.autoAddTranslatedVocab]);

  // 供单词库快速查词与单条重译复用
  const handleLookupAndTranslate = useCallback(
    async (payload: {
      surface: string;
      sentence?: string;
      subject?: string;
      preferApi?: boolean;
    }): Promise<LookupResult> => {
      if (payload.preferApi && translationStatus?.configured) {
        return studyhubApi.translateWord({
          surface: payload.surface,
          sentence: payload.sentence,
          subject: payload.subject,
        });
      }
      const localRes = await studyhubApi.lookup(payload.surface);
      if (
        translationStatus?.configured &&
        (preferences.translationMode === 'always_api' || !localRes.found)
      ) {
        return studyhubApi.translateWord({
          surface: payload.surface,
          sentence: payload.sentence,
          subject: payload.subject,
        });
      }
      return localRes;
    },
    [translationStatus?.configured, preferences.translationMode],
  );

  const handleUpdateWord = useCallback(
    async (
      id: string,
      patch: { meaning_zh?: string; status?: VocabStatus; subject?: string },
    ) => {
      const updated = await studyhubApi.updateVocab(id, patch);
      setWords(updated.words);
      void studyhubApi.getStatus().then(setFolderStatus);
    },
    [],
  );

  const handleDeleteWord = useCallback(async (id: string) => {
    const updated = await studyhubApi.deleteVocab(id);
    setWords(updated.words);
    void studyhubApi.getStatus().then(setFolderStatus);
  }, []);

  const handleRecordReview = useCallback(async (id: string, remembered: boolean) => {
    const updated = await studyhubApi.recordReview(id, remembered);
    setWords(updated.words);
    void studyhubApi.getStatus().then(setFolderStatus);
  }, []);

  const handleSaveResult = useCallback(async (filename: string, result: QuizResultFile) => {
    await studyhubApi.saveResult(filename, result);
    const list = await studyhubApi.getResults();
    setResults(list.results);
    void studyhubApi.getStatus().then(setFolderStatus);
  }, []);

  const handleChangeDataDir = useCallback(
    async (dir: string) => {
      const nextStatus = await studyhubApi.setDataDir(dir);
      setFolderStatus(nextStatus);
      await refreshAll();
    },
    [refreshAll],
  );

  const handleImportInbox = useCallback(
    async (filename: string, data: { words: unknown[] }) => {
      const res = await studyhubApi.importInbox(filename, data);
      setWords(res.vocab.words);
      void studyhubApi.getStatus().then(setFolderStatus);
      return res.addedCount;
    },
    [],
  );

  const handleImportDictCsv = useCallback(async (filename: string, content: string) => {
    const nextStatus = await studyhubApi.importDictCsv(filename, content);
    setFolderStatus(nextStatus);
  }, []);

  const existingPopoverEntry = useMemo(() => {
    if (!activeLookup?.result) return null;
    return vocabLookupMap.get(normalizeWordKey(activeLookup.result.word)) ?? null;
  }, [activeLookup?.result, vocabLookupMap]);

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'quiz', label: '测验', icon: ClipboardCheck, count: quizzes.length },
    { id: 'vocab', label: '单词库', icon: Library, count: learningCount },
    { id: 'review', label: '复习', icon: Layers, count: dueReviewCount },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  const selectNav = (tab: NavTab) => {
    setActiveTab(tab);
    setActiveLookup(null);
    setMobileNavOpen(false);
  };

  const wordLookupBehavior = useMemo(
    () => ({
      triggerMode: preferences.wordLookupTrigger,
      onHoverScheduleClose: scheduleHoverClose,
      onHoverCancelClose: cancelHoverClose,
    }),
    [preferences.wordLookupTrigger, scheduleHoverClose, cancelHoverClose],
  );

  return (
    <WordLookupBehaviorContext.Provider value={wordLookupBehavior}>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      {/* 移动端顶部导航栏 */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden dark:border-slate-800 dark:bg-[#0F172A]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="打开导航菜单"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-slate-50">
            Joel Study Hub
          </span>
        </div>

        <button
          type="button"
          aria-label={preferences.theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
          onClick={() =>
            updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' })
          }
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {preferences.theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* 移动端侧栏遮罩 */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* 左侧主导航栏 */}
      <aside
        aria-label="主导航"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 dark:border-slate-800 dark:bg-[#0F172A] ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-slate-50">
            Joel Study Hub
          </span>
          <button
            type="button"
            aria-label="关闭导航菜单"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => selectNav(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                    {item.count}
                  </span>
                )}
                {item.id === 'settings' &&
                  (updateState?.phase === 'available' || updateState?.phase === 'downloaded') && (
                    <span
                      aria-label="发现新版本"
                      className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"
                    />
                  )}
              </button>
            );
          })}
        </nav>

        {/* 底部查词方式与主题切换 */}
        <div className="space-y-1 border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            title="切换鼠标指到自动翻译 / 点击单词显示"
            onClick={() =>
              updatePreferences({
                wordLookupTrigger:
                  preferences.wordLookupTrigger === 'hover' ? 'click' : 'hover',
              })
            }
            className="flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50"
          >
            <span className="flex items-center gap-3">
              <MousePointerClick className="h-4 w-4 shrink-0" />
              <span>
                {preferences.wordLookupTrigger === 'hover'
                  ? '查词：指到即译'
                  : '查词：点击显示'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' })
            }
            className="flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50"
          >
            <span className="flex items-center gap-3">
              {preferences.theme === 'dark' ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )}
              <span>{preferences.theme === 'dark' ? '切换浅色模式' : '切换深色模式'}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="min-w-0 flex-1 px-4 pt-20 pb-16 sm:px-8 lg:px-10 lg:pt-8">
        {liveBanner && (
          <div
            role="status"
            className="mx-auto mb-6 flex max-w-5xl items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-200"
          >
            <span>{liveBanner}</span>
            <button
              type="button"
              onClick={() => setLiveBanner('')}
              aria-label="关闭同步通知"
              className="ml-4 text-blue-600 hover:text-blue-900 dark:text-blue-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            className="mx-auto mb-6 flex max-w-5xl items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/70 dark:bg-red-950/40 dark:text-red-200"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="shrink-0 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              重试
            </button>
          </div>
        )}

        {loading ? (
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-32 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-32 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : (
          <>
            {activeTab === 'quiz' && (
              <QuizView
                quizzes={quizzes}
                results={results}
                vocabLookupMap={vocabLookupMap}
                fontScale={preferences.fontScale}
                isPopoverOpen={Boolean(activeLookup)}
                onWordClick={(p) => void handleWordClick(p)}
                onSaveResult={handleSaveResult}
              />
            )}

            {activeTab === 'vocab' && (
              <VocabView
                words={words}
                vocabLookupMap={vocabLookupMap}
                translationConfigured={Boolean(translationStatus?.configured)}
                onWordClick={(p) => void handleWordClick(p)}
                onLookupAndTranslate={handleLookupAndTranslate}
                onAddVocab={handleAddVocab}
                onUpdateWord={handleUpdateWord}
                onDeleteWord={handleDeleteWord}
              />
            )}

            {activeTab === 'review' && (
              <ReviewView
                words={words}
                vocabLookupMap={vocabLookupMap}
                fontScale={preferences.fontScale}
                onRecordReview={handleRecordReview}
                onMarkWordStatus={(id, status) => handleUpdateWord(id, { status })}
                onWordClick={(p) => void handleWordClick(p)}
                onNavigateVocab={() => selectNav('vocab')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                status={folderStatus}
                translationStatus={translationStatus}
                results={results}
                preferences={preferences}
                isDesktopClient={studyhubApi.isDesktopClient()}
                updateState={updateState}
                onCheckForUpdates={async () => {
                  const next = await studyhubApi.checkForUpdates();
                  setUpdateState(next);
                }}
                onDownloadUpdate={async () => {
                  const next = await studyhubApi.downloadUpdate();
                  setUpdateState(next);
                }}
                onQuitAndInstall={() => studyhubApi.quitAndInstall()}
                onOpenReleasesPage={() => studyhubApi.openReleasesPage()}
                onUpdatePreferences={updatePreferences}
                onChangeDataDir={handleChangeDataDir}
                onPickDataDir={async () => {
                  const res = await studyhubApi.pickDataDir();
                  if (!res.canceled && res.status) {
                    setFolderStatus(res.status);
                    await refreshAll();
                  }
                }}
                onOpenDataDir={() => studyhubApi.openDataDir()}
                onImportInbox={handleImportInbox}
                onImportDictCsv={handleImportDictCsv}
                onSaveTranslationConfig={handleSaveTranslationConfig}
                onFetchTranslationModels={handleFetchTranslationModels}
                onTestTranslate={(payload) => studyhubApi.translateWord(payload)}
              />
            )}
          </>
        )}
      </main>

      {/* 全局查词翻译悬浮卡片 */}
      <WordLookupPopover
        lookup={activeLookup}
        existingEntry={existingPopoverEntry}
        translationConfigured={Boolean(translationStatus?.configured)}
        translationModel={translationStatus?.model}
        onRequestApiTranslate={handleRequestApiTranslate}
        onSelectSynonym={(synonym) => {
          if (!activeLookup) return;
          void handleWordClick({
            surface: synonym,
            sentence: activeLookup.sentence,
            anchorRect: activeLookup.anchorRect,
            source: activeLookup.source,
            subject: activeLookup.subject,
            trigger: activeLookup.openedBy ?? 'click',
          });
        }}
        onAddVocab={handleAddVocab}
        onUpdateExistingMeaning={(id, meaningZh) =>
          handleUpdateWord(id, { meaning_zh: meaningZh })
        }
        onClose={() => {
          cancelHoverClose();
          setActiveLookup(null);
        }}
        onMouseEnter={cancelHoverClose}
        onMouseLeave={scheduleHoverClose}
      />
      </div>
    </WordLookupBehaviorContext.Provider>
  );
}
