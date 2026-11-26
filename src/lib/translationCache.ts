import type { LookupResult, TranslationMode, VocabEntry } from '../types/studyhub';
import { splitMeaningSenses } from './dictionary';
import { cleanToken } from './textTokenize';

export const BASIC_STOP_WORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'with',
  'from', 'into', 'onto', 'upon', 'about', 'as', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
  'being', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'shall', 'should', 'can',
  'could', 'may', 'might', 'must', 'this', 'that', 'these', 'those', 'it', 'its', 'he', 'him',
  'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'i',
  'me', 'my', 'who', 'whom', 'whose', 'which', 'what', 'where', 'when', 'why', 'how', 'not', 'no',
  'nor', 'so', 'too', 'very', 'than', 'then', 'there', 'here', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'also', 'just', 'up',
  'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once', 'because', 'while',
  'during', 'before', 'after', 'above', 'below', 'between', 'through', 'against', 'without',
  'within', 'per', 'via',
]);

export function isBasicStopWord(raw: string): boolean {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed.includes(' ')) return false;
  const cleaned = cleanToken(trimmed).toLowerCase();
  if (!cleaned) return false;
  return BASIC_STOP_WORDS.has(cleaned);
}

export function shouldSkipAutoApiLookup(
  surface: string,
  localResult: LookupResult,
  mode: TranslationMode,
): boolean {
  if (mode === 'manual') return true;
  if (mode === 'auto_fallback') return localResult.found;
  // always_api: skip basic stop words if already found in local dictionary
  return (
    localResult.found &&
    !surface.trim().includes(' ') &&
    (isBasicStopWord(surface) || isBasicStopWord(localResult.word))
  );
}

export function hashSentence(sentence: string): string {
  const normalized = (sentence || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function mergeVocabIntoLocalLookup(
  localResult: LookupResult,
  vocabEntry?: VocabEntry | null,
): LookupResult {
  if (!vocabEntry) return localResult;

  const vocabMeaning = vocabEntry.meaning_zh.trim();
  const vocabPhonetic = vocabEntry.phonetic.trim();
  const vocabPos = vocabEntry.pos.trim();

  if (!localResult.found) {
    if (!vocabMeaning) return localResult;
    return {
      ...localResult,
      word: vocabEntry.word,
      phonetic: vocabPhonetic || localResult.phonetic,
      pos: vocabPos || localResult.pos,
      meaning_zh: vocabMeaning,
      found: true,
    };
  }

  if (localResult.source === 'ecdict') {
    const mergedPhonetic = localResult.phonetic || vocabPhonetic;
    const mergedPos = localResult.pos || vocabPos;
    if (vocabMeaning && vocabMeaning !== localResult.meaning_zh.trim()) {
      const vocabParts = new Set(splitMeaningSenses(vocabMeaning));
      const ecdictSenses = [
        ...splitMeaningSenses(localResult.meaning_zh),
        ...(localResult.alternatives ?? []),
      ];
      const mergedAlts: string[] = [];
      for (const s of ecdictSenses) {
        const trimmed = s.trim();
        if (!trimmed || trimmed === vocabMeaning || vocabParts.has(trimmed)) continue;
        if (!mergedAlts.includes(trimmed)) {
          mergedAlts.push(trimmed);
          if (mergedAlts.length >= 6) break;
        }
      }
      return {
        ...localResult,
        phonetic: mergedPhonetic,
        pos: mergedPos,
        meaning_zh: vocabMeaning,
        alternatives: mergedAlts,
      };
    }
    return {
      ...localResult,
      phonetic: mergedPhonetic,
      pos: mergedPos,
    };
  }

  if (localResult.source === 'glossary') {
    return {
      ...localResult,
      phonetic: localResult.phonetic || vocabPhonetic,
    };
  }

  return localResult;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_CACHE_KEY = 'studyhub_ai_translate_cache_v2';
const DEFAULT_MAX_ENTRIES = 800;

export class PersistentTranslationCache {
  private readonly storage: StorageLike | null;
  private readonly storageKey: string;
  private readonly maxEntries: number;
  private map: Map<string, LookupResult>;

  constructor(
    storage?: StorageLike | null,
    storageKey = DEFAULT_CACHE_KEY,
    maxEntries = DEFAULT_MAX_ENTRIES,
  ) {
    if (storage !== undefined) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
    this.storageKey = storageKey;
    this.maxEntries = maxEntries;
    this.map = this.load();
  }

  private exactKey(model: string, wordKey: string, sentence: string): string {
    return `e|${model.trim()}|${wordKey.trim().toLowerCase()}|${hashSentence(sentence)}`;
  }

  private wordFallbackKey(model: string, wordKey: string): string {
    return `w|${model.trim()}|${wordKey.trim().toLowerCase()}`;
  }

  private load(): Map<string, LookupResult> {
    const map = new Map<string, LookupResult>();
    if (!this.storage) return map;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return map;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (Array.isArray(item) && typeof item[0] === 'string' && item[1] && typeof item[1] === 'object') {
            map.set(item[0], item[1] as LookupResult);
          }
        }
      }
    } catch {
      // ignore corrupted cache
    }
    return map;
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(Array.from(this.map.entries())));
    } catch {
      // ignore storage quota errors
    }
  }

  private touch(key: string, value: LookupResult): void {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  getExact(model: string, wordKey: string, sentence: string): LookupResult | undefined {
    const key = this.exactKey(model, wordKey, sentence);
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.touch(key, hit);
    return { ...hit };
  }

  getWordFallback(model: string, wordKey: string): LookupResult | undefined {
    const key = this.wordFallbackKey(model, wordKey);
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.touch(key, hit);
    return { ...hit, context_zh: undefined };
  }

  set(model: string, wordKey: string, sentence: string, result: LookupResult): void {
    const eKey = this.exactKey(model, wordKey, sentence);
    const wKey = this.wordFallbackKey(model, wordKey);
    this.touch(eKey, { ...result });
    this.touch(wKey, { ...result, context_zh: undefined });
    this.persist();
  }

  deleteExact(model: string, wordKey: string, sentence: string): void {
    const eKey = this.exactKey(model, wordKey, sentence);
    if (this.map.delete(eKey)) {
      this.persist();
    }
  }
}
