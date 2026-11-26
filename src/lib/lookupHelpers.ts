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
  // 按实测延迟排序：优先选择支持关闭思维链的低延迟 Flash 对话模型，避免默认 high 推理模型（如 hy4flash-free）耗时过长
  const preferredOrder = [
    'auto/deepseek-v4.1-flash',
    'workbuddy-ai/deepseek-v4.1-flash-sg',
    'workbuddy/deepseek-v4.1-flash',
    'auto/minimax-m3.1-flash',
    'raccoon/sn-sensenova-6-8-flash-lite',
    'raccoon/sn-sensenova-6-8-flash',
  ];
  for (const cand of preferredOrder) {
    const hit = chatModels.find((m) => m.toLowerCase() === cand);
    if (hit) return hit;
  }
  const nonSlowFallback = chatModels.find((m) => !m.toLowerCase().includes('hy4flash'));
  return nonSlowFallback || chatModels[0];
}

/**
 * Format phonetic string cleanly without producing double slashes (`//...//`).
 */
export function formatPhoneticDisplay(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.includes('/')) {
    return trimmed.replace(/\/{2,}/g, '/');
  }
  return `/${trimmed}/`;
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
  const contextZh = api.context_zh?.trim() || undefined;
  if (contextZh) {
    meaningParts.add(contextZh);
  }

  const mergedAlternatives: string[] = [];
  const pushAlt = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    if (meaningParts.has(trimmed) || trimmed === api.meaning_zh.trim() || trimmed === contextZh) {
      return;
    }
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
    context_zh: contextZh,
    phonetic: api.phonetic || base.phonetic,
    pos: api.pos || base.pos,
    alternatives: mergedAlternatives.slice(0, 6),
    glossaryNote,
  };
}
