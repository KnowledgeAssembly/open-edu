import type { AiGenerateResult } from './types.js';

const AI_REVIEW_KEY = 'openedu.studio.ai.review';

function isAiGenerateResult(value: unknown): value is AiGenerateResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.success === 'boolean' &&
    Array.isArray(candidate.quality) &&
    Array.isArray(candidate.outlinePreview)
  );
}

export function writeAiReview(result: AiGenerateResult): void {
  try {
    sessionStorage.setItem(AI_REVIEW_KEY, JSON.stringify(result));
  } catch {
    // storage unavailable
  }
}

export function readAiReview(): AiGenerateResult | null {
  try {
    const raw = sessionStorage.getItem(AI_REVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isAiGenerateResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAiReview(): void {
  try {
    sessionStorage.removeItem(AI_REVIEW_KEY);
  } catch {
    // storage unavailable
  }
}
