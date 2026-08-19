import {
  generateItemAdd as generateItemAddImpl,
  generateItemEdit as generateItemEditImpl,
  assertItemAddBody,
  assertItemEditBody,
  type ItemKind,
} from '../studio/ai/itemGenerate.js';
import { GatewayError } from './errors.js';
import type { ItemAddRequest, ItemEditRequest } from './requestSchema.js';

export interface ItemGenerationDeps {
  generateItemAdd?: typeof generateItemAddImpl;
  generateItemEdit?: typeof generateItemEditImpl;
}

function unwrapError(result: { ok: false; error: string } | { ok: true }): string {
  if (result.ok) throw new Error('unwrapError called on success result');
  return result.error;
}

/**
 * Generate / edit a single course item without any server-side draft state.
 * The gateway does not have an active package on disk, so course context is
 * intentionally empty; the browser owns local context.
 */
export async function generateItem(
  request: ItemAddRequest | ItemEditRequest,
  requestId: string,
  deps: ItemGenerationDeps = {},
) {
  const add = deps.generateItemAdd ?? generateItemAddImpl;
  const edit = deps.generateItemEdit ?? generateItemEditImpl;

  if ('description' in request) {
    const { kind, description, existingTitles } = assertItemAddBody(request);
    const result = await add({
      kind,
      description,
      packageDir: '',
      ...(existingTitles ? { existingTitles } : {}),
    });
    if (!result.ok) {
      throw new GatewayError(
        'generation-error',
        safeItemError(unwrapError(result)),
        requestId,
        502,
      );
    }
    return { requestId, ok: true as const, item: result.item };
  }

  const { kind, intent, currentContent, params, existingTitles } = assertItemEditBody(request);
  const result = await edit({
    kind,
    intent,
    currentContent,
    params,
    packageDir: '',
    ...(existingTitles ? { existingTitles } : {}),
  });
  if (!result.ok) {
    throw new GatewayError('generation-error', safeItemError(unwrapError(result)), requestId, 502);
  }
  return { requestId, ok: true as const, items: result.items };
}

function safeItemError(raw: string): string {
  if (/unavailable|not configured|no api key/i.test(raw)) {
    return 'AI is not configured. Add a provider key on the server.';
  }
  return 'The AI provider could not draft this item.';
}

/**
 * Validates and narrows the raw request body to a typed `ItemAddRequest` or `ItemEditRequest`.
 *
 * Note: `existingTitles` is intentionally omitted from the returned object. The Zod
 * validation handles its shape, but downstream callers (the `dispatch` function) use the
 * original request body rather than this narrowed result, so `existingTitles` is preserved
 * in the call path. Do not use this function as the canonical request shape for forwarding.
 */
export function assertItemBody(body: unknown): ItemAddRequest | ItemEditRequest {
  const candidate = (body ?? {}) as { intent?: unknown };
  if (candidate.intent !== undefined) {
    const { kind, intent, currentContent, params } = assertItemEditBody(body);
    const edit: ItemEditRequest = { kind, intent, currentContent };
    if (params) edit.params = params;
    return edit;
  }
  const { kind, description } = assertItemAddBody(body);
  return { kind, description };
}

export type { ItemKind };
