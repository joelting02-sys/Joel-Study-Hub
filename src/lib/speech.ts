import { studyhubApi } from '../api/studyhubApi';
import type { SpeechAccent, SpeechEngine, SpeechRate } from '../types/studyhub';

export interface SpeechState {
  speakingKey: string | null;
  status: 'idle' | 'loading' | 'playing';
}

type SpeechListener = (state: SpeechState) => void;

const MAX_BLOB_CACHE = 150;
const ONLINE_FETCH_TIMEOUT_MS = 3500;

let currentState: SpeechState = { speakingKey: null, status: 'idle' };
const listeners = new Set<SpeechListener>();
const blobUrlCache = new Map<string, string>();
let activeAudio: HTMLAudioElement | null = null;
let playSeq = 0;

function setState(next: SpeechState) {
  currentState = next;
  for (const fn of listeners) {
    fn(currentState);
  }
}

export function getSpeechState(): SpeechState {
  return currentState;
}

export function subscribeSpeechState(listener: SpeechListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function makeSpeechKey(text: string, accent: SpeechAccent): string {
  return `${accent}|${(text || '').trim().replace(/\s+/g, ' ').toLowerCase()}`;
}

export function stopSpeaking(): void {
  playSeq += 1;
  if (activeAudio) {
    try {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  if (currentState.status !== 'idle' || currentState.speakingKey !== null) {
    setState({ speakingKey: null, status: 'idle' });
  }
}

function cacheBlobUrl(key: string, url: string) {
  blobUrlCache.delete(key);
  blobUrlCache.set(key, url);
  while (blobUrlCache.size > MAX_BLOB_CACHE) {
    const oldestKey = blobUrlCache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldUrl = blobUrlCache.get(oldestKey);
    blobUrlCache.delete(oldestKey);
    if (oldUrl) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {
        // ignore
      }
    }
  }
}

function base64ToBlobUrl(base64: string, mime: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime || 'audio/mpeg' });
  return URL.createObjectURL(blob);
}

function playAudioUrl(url: string, rate: SpeechRate, key: string, seq: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (seq !== playSeq) {
      resolve();
      return;
    }
    const audio = new Audio(url);
    audio.playbackRate = rate;
    activeAudio = audio;
    setState({ speakingKey: key, status: 'playing' });

    const cleanup = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      if (seq === playSeq) {
        setState({ speakingKey: null, status: 'idle' });
      }
    };

    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Audio playback failed'));
    };

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        cleanup();
        reject(err);
      });
    }
  });
}

function pickPreferredVoice(voices: SpeechSynthesisVoice[], accent: SpeechAccent): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const targetLang = accent.toLowerCase();
  const langMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(targetLang));
  const pool = langMatches.length > 0 ? langMatches : voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (!pool.length) return null;

  const score = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    let s = 0;
    if (v.lang.toLowerCase() === targetLang) s += 10;
    if (name.includes('natural')) s += 8;
    if (name.includes('online')) s += 6;
    if (name.includes('google')) s += 4;
    if (name.includes('microsoft')) s += 2;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

function speakWithWebSpeech(
  text: string,
  accent: SpeechAccent,
  rate: SpeechRate,
  key: string,
  seq: number,
): Promise<void> {
  return new Promise((resolve) => {
    if (seq !== playSeq || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (seq === playSeq) setState({ speakingKey: null, status: 'idle' });
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent;
      utterance.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const voice = pickPreferredVoice(voices, accent);
      if (voice) {
        utterance.voice = voice;
      }

      setState({ speakingKey: key, status: 'playing' });
      const finish = () => {
        if (seq === playSeq) {
          setState({ speakingKey: null, status: 'idle' });
        }
        resolve();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    } catch {
      if (seq === playSeq) {
        setState({ speakingKey: null, status: 'idle' });
      }
      resolve();
    }
  });
}

export async function speakWord(
  text: string,
  opts: { accent: SpeechAccent; rate: SpeechRate; engine: SpeechEngine },
): Promise<void> {
  const cleaned = (text || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return;

  const key = makeSpeechKey(cleaned, opts.accent);
  if (currentState.speakingKey === key && currentState.status !== 'idle') {
    stopSpeaking();
    return;
  }

  stopSpeaking();
  const seq = playSeq;

  if (opts.engine === 'online_cached' && cleaned.length <= 160) {
    const cachedUrl = blobUrlCache.get(key);
    if (cachedUrl) {
      try {
        await playAudioUrl(cachedUrl, opts.rate, key, seq);
        return;
      } catch {
        blobUrlCache.delete(key);
      }
    }

    setState({ speakingKey: key, status: 'loading' });
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('TTS fetch timeout')), ONLINE_FETCH_TIMEOUT_MS);
      });
      const res = await Promise.race([
        studyhubApi.fetchTtsAudio({ text: cleaned, accent: opts.accent }),
        timeoutPromise,
      ]);
      if (seq !== playSeq) return;
      const blobUrl = base64ToBlobUrl(res.audioBase64, res.mime);
      cacheBlobUrl(key, blobUrl);
      await playAudioUrl(blobUrl, opts.rate, key, seq);
      return;
    } catch {
      if (seq !== playSeq) return;
      // fall back to Web Speech API
    }
  }

  await speakWithWebSpeech(cleaned, opts.accent, opts.rate, key, seq);
}
