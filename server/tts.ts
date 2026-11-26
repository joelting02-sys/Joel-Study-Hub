import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { TtsAudioInput, TtsAudioResult } from '../src/types/studyhub.ts';

const TTS_TIMEOUT_MS = 4000;
const MIN_AUDIO_BYTES = 256;
const MAX_AUDIO_BYTES = 2_000_000;
const CACHE_DIR = path.join(os.tmpdir(), 'studyhub-audio-cache');

export function normalizeTtsAccent(raw?: string): { label: 'en-US' | 'en-GB'; typeParam: '1' | '2' } {
  const lower = (raw || '').trim().toLowerCase();
  if (lower === 'en-gb' || lower === 'uk') {
    return { label: 'en-GB', typeParam: '1' };
  }
  return { label: 'en-US', typeParam: '2' };
}

export function sanitizeTtsText(raw: string): string {
  const cleaned = (raw || '').trim().replace(/\s+/g, ' ').slice(0, 160).trim();
  if (!cleaned) {
    throw new Error('缺少待朗读的英文单词');
  }
  return cleaned;
}

export async function fetchTtsAudio(
  input: TtsAudioInput,
  fetchImpl: typeof fetch = fetch,
): Promise<TtsAudioResult> {
  const cleaned = sanitizeTtsText(input.text);
  const { label, typeParam } = normalizeTtsAccent(input.accent);

  const hashHex = crypto
    .createHash('sha256')
    .update(`${label}|${cleaned.toLowerCase()}`)
    .digest('hex');

  const cachePath = path.join(CACHE_DIR, `${hashHex}.mp3`);
  try {
    if (fs.existsSync(cachePath)) {
      const buf = fs.readFileSync(cachePath);
      if (buf.length > MIN_AUDIO_BYTES && buf.length < MAX_AUDIO_BYTES) {
        return {
          mime: 'audio/mpeg',
          audioBase64: buf.toString('base64'),
          cached: true,
        };
      }
    }
  } catch {
    // ignore cache read errors
  }

  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleaned)}&type=${typeParam}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const resp = await fetchImpl(url, {
      method: 'GET',
      headers: { 'User-Agent': 'StudyHub/1.0' },
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`词典发音接口返回 HTTP ${resp.status}`);
    }
    const contentType = (resp.headers.get('content-type') || '').toLowerCase();
    const arrayBuf = await resp.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const isMp3 =
      contentType.includes('audio') ||
      contentType.includes('octet-stream') ||
      (buf.length >= 3 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
      (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);

    if (buf.length <= MIN_AUDIO_BYTES || buf.length >= MAX_AUDIO_BYTES || !isMp3) {
      throw new Error('发音接口返回了无效的音频内容');
    }

    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      const tmpPath = `${cachePath}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tmpPath, buf);
      fs.renameSync(tmpPath, cachePath);
    } catch {
      // ignore cache write errors
    }

    return {
      mime: 'audio/mpeg',
      audioBase64: buf.toString('base64'),
      cached: false,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('词典发音请求超时');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
