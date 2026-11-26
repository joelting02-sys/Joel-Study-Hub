/**
 * StudyHub 本地后端与 Vite 开发/生产服务器入口
 * - 端口固定 3000，供浏览器或 Electron 窗口加载
 * - 提供本地文件读写 API 与 SSE 实时推送
 */

import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { StudyHubStorage, type StorageChangeEvent } from './server/storage.ts';
import {
  fetchAvailableModels,
  getTranslationApiStatus,
  saveTranslationConfig,
  translateWordWithApi,
} from './server/translator.ts';
import { fetchTtsAudio } from './server/tts.ts';

function readCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const PORT = Number(readCliArg('--port') || process.env.PORT || 3000);
const HOST = readCliArg('--host') || process.env.HOST || '0.0.0.0';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const storage = new StudyHubStorage();

  app.use(express.json({ limit: '50mb' }));

  // ==================== SSE 实时推送 ====================
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const onChange = (event: StorageChangeEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    storage.on('change', onChange);
    // 心跳保持连接
    const timer = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(timer);
      storage.off('change', onChange);
    });
  });

  // ==================== 状态与设置 ====================
  app.get('/api/status', (_req, res) => {
    res.json(storage.getStatus());
  });

  app.post('/api/settings/data-dir', (req, res) => {
    try {
      const { dataDir } = req.body as { dataDir?: string };
      if (!dataDir || typeof dataDir !== 'string') {
        res.status(400).json({ error: '请提供有效的数据目录路径' });
        return;
      }
      const status = storage.setDataDir(dataDir);
      res.json(status);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '修改目录失败' });
    }
  });

  // ==================== 离线词典查询与导入 ====================
  app.post('/api/dict/lookup', (req, res) => {
    const { surface, glossary, matchedGlossaryKey } = req.body as {
      surface?: string;
      glossary?: Record<string, string>;
      matchedGlossaryKey?: string;
    };
    if (!surface || typeof surface !== 'string') {
      res.status(400).json({ error: '缺少待查询单词' });
      return;
    }
    const result = storage.lookup(surface, { glossary, matchedGlossaryKey });
    res.json(result);
  });

  app.post('/api/dict/import-csv', (req, res) => {
    try {
      const { filename, content } = req.body as { filename?: string; content?: string };
      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'CSV 内容为空' });
        return;
      }
      const status = storage.saveExternalDictCsv(filename || 'ecdict.csv', content);
      res.json(status);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '导入词典失败' });
    }
  });

  // ==================== 外部翻译模型 API 代理 ====================
  app.get('/api/translate/status', (_req, res) => {
    res.json(getTranslationApiStatus());
  });

  app.post('/api/translate/config', (req, res) => {
    try {
      const body = (req.body || {}) as {
        baseUrl?: unknown;
        apiKey?: unknown;
        clearApiKey?: unknown;
        model?: unknown;
      };
      const status = saveTranslationConfig({
        baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : '',
        apiKey: typeof body.apiKey === 'string' ? body.apiKey : undefined,
        clearApiKey: Boolean(body.clearApiKey),
        model: typeof body.model === 'string' ? body.model : '',
      });
      res.json(status);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '保存翻译配置失败' });
    }
  });

  app.post('/api/translate/models', async (req, res) => {
    try {
      const body = (req.body || {}) as { baseUrl?: unknown; apiKey?: unknown };
      const result = await fetchAvailableModels({
        baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
        apiKey: typeof body.apiKey === 'string' ? body.apiKey : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '侦测模型列表失败' });
    }
  });

  app.post('/api/dict/translate', async (req, res) => {
    try {
      const { surface, sentence, subject } = (req.body || {}) as {
        surface?: unknown;
        sentence?: unknown;
        subject?: unknown;
      };
      if (typeof surface !== 'string' || !surface.trim()) {
        res.status(400).json({ error: '缺少待翻译的单词或短语' });
        return;
      }
      const translated = await translateWordWithApi({
        surface,
        sentence: typeof sentence === 'string' ? sentence : '',
        subject: typeof subject === 'string' ? subject : '',
      });
      res.json(translated);
    } catch (err) {
      const message = err instanceof Error ? err.message : '调用翻译接口失败';
      const statusCode = message.includes('尚未完成') ? 503 : 502;
      res.status(statusCode).json({ error: message });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const { text, accent } = (req.body || {}) as { text?: unknown; accent?: unknown };
      if (typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: '缺少待朗读的英文单词' });
        return;
      }
      const audio = await fetchTtsAudio({
        text,
        accent: accent === 'en-GB' ? 'en-GB' : 'en-US',
      });
      res.json(audio);
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取词典发音失败';
      const statusCode = message.includes('缺少') ? 400 : 502;
      res.status(statusCode).json({ error: message });
    }
  });

  // ==================== 单词库 CRUD 与导出 ====================
  app.get('/api/vocab', (_req, res) => {
    res.json(storage.readVocabFile());
  });

  app.post('/api/vocab', (req, res) => {
    try {
      const body = req.body;
      if (!body || typeof body.word !== 'string' || !body.word.trim()) {
        res.status(400).json({ error: '单词不能为空' });
        return;
      }
      const result = storage.addVocab({
        word: body.word,
        meaning_zh: typeof body.meaning_zh === 'string' ? body.meaning_zh : '',
        phonetic: typeof body.phonetic === 'string' ? body.phonetic : '',
        pos: typeof body.pos === 'string' ? body.pos : '',
        context: typeof body.context === 'string' ? body.context : '',
        source: typeof body.source === 'string' ? body.source : '',
        subject: typeof body.subject === 'string' ? body.subject : '其他',
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '保存单词失败' });
    }
  });

  app.patch('/api/vocab/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updated = storage.updateVocab(id, req.body || {});
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新单词失败' });
    }
  });

  app.delete('/api/vocab/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updated = storage.deleteVocab(id);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除单词失败' });
    }
  });

  app.post('/api/vocab/review/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { remembered } = req.body as { remembered?: boolean };
      const updated = storage.recordReview(id, Boolean(remembered));
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '记录复习失败' });
    }
  });

  app.get('/api/vocab/export-markdown', (_req, res) => {
    const md = storage.exportMarkdown();
    res.json({ markdown: md, path: storage.getStatus().exportPath });
  });

  app.post('/api/inbox/import', (req, res) => {
    try {
      const { filename, data } = req.body as { filename?: string; data?: { words: unknown[] } };
      if (!data || !Array.isArray(data.words)) {
        res.status(400).json({ error: 'vocab_inbox JSON 必须包含 words 数组' });
        return;
      }
      const result = storage.dropInboxFile(filename || 'inbox.json', data as never);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '导入 vocab_inbox 失败' });
    }
  });

  // ==================== 测验与结果 ====================
  app.get('/api/quizzes', (_req, res) => {
    res.json({ quizzes: storage.listQuizzes() });
  });

  app.post('/api/quizzes/import', (req, res) => {
    try {
      const { filename, quiz } = req.body;
      const saved = storage.importQuiz(filename || 'quiz.json', quiz);
      res.json({ quiz: saved, quizzes: storage.listQuizzes() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '导入测验失败' });
    }
  });

  app.get('/api/results', (_req, res) => {
    res.json({ results: storage.listResults() });
  });

  app.post('/api/results', (req, res) => {
    try {
      const { filename, result } = req.body;
      if (!filename || !result || !result.quiz_id) {
        res.status(400).json({ error: '测验结果数据不完整' });
        return;
      }
      const saved = storage.saveQuizResult(filename, result);
      res.json({ result: saved });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '保存测验结果失败' });
    }
  });

  // ==================== 前端静态资源 / Vite 中间件 ====================
  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distDir, 'index.html'));

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: hmrDisabled ? false : undefined,
        hmr: hmrDisabled ? false : { server: httpServer },
        watch: hmrDisabled ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`[StudyHub] 服务已启动: http://localhost:${PORT}`);
    console.log(`[StudyHub] 数据目录: ${storage.getDataDir()}`);
  });

  const shutdown = () => {
    void storage.close().finally(() => {
      httpServer.close(() => process.exit(0));
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[StudyHub] 启动失败:', err);
  process.exit(1);
});
