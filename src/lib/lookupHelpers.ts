/**
 * Shared frontend/model translation helpers for multi-sense enrichment.
 */

import type { LookupResult } from '../types/studyhub';

export function isDedicatedTranslationModel(model: string): boolean {
  const lower = (model || '').trim().toLowerCase();
  if (!lower) return false;
  return (
    lower.includes('doubao-seed-translation') ||
    lower.includes('seed-translation') ||
    lower.includes('doubao-translate') ||
    lower.includes('volcengine-translate') ||
    lower.includes('microsoft-translator') ||
    lower.endsWith('-translate') ||
    lower.endsWith('-translator') ||
    lower.endsWith('/translate')
  );
}

/**
 * Pick the best general-purpose chat model from a detected /models list
 * when switching away from a single-translation endpoint.
 */
export function pickPreferredChatModel(models: string[]): string | undefined {
  const chatModels = models.filter((m) => !isDedicatedTranslationModel(m));
  if (chatModels.length === 0) return undefined;
  const preferredOrder = [
    'auto/hy4flash-free',
    'auto/deepseek-v4.1-flash',
    'auto/minimax-m3.1-flash',
    'ai-studio/gemini-4-hydrogen',
  ];
  for (const cand of preferredOrder) {
    const hit = chatModels.find((m) => m.toLowerCase() === cand);
    if (hit) return hit;
  }
  return chatModels[0];
}

/**
 * Merge local glossary/ECDICT details into an AI model result so syllabus
 * glossary terminology and phonetic info are preserved alongside rich senses.
 */
export function mergeLookupEnrichment(base: LookupResult, api: LookupResult): LookupResult {
  const meaningParts = new Set(
    api.meaning_zh
      .split(/[；;，,]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const mergedAlternatives: string[] = [];
  const pushAlt = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    if (meaningParts.has(trimmed) || trimmed === api.meaning_zh.trim()) return;
    if (!mergedAlternatives.includes(trimmed)) {
      mergedAlternatives.push(trimmed);
    }
  };

  for (const alt of api.alternatives ?? []) pushAlt(alt);
  if (base.source === 'glossary' && base.meaning_zh.trim()) {
    pushAlt(base.meaning_zh);
  }
  for (const alt of base.alternatives ?? []) pushAlt(alt);

  const glossaryNote =
    base.source === 'glossary' &&
    base.meaning_zh.trim() &&
    !meaningParts.has(base.meaning_zh.trim())
      ? base.meaning_zh.trim()
      : api.glossaryNote;

  return {
    ...api,
    phonetic: api.phonetic || base.phonetic,
    pos: api.pos || base.pos,
    alternatives: mergedAlternatives.slice(0, 6),
    glossaryNote,
  };
}
