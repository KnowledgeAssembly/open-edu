import {
  generateItemAdd as generateItemAddImpl,
  generateItemEdit as generateItemEditImpl,
  assertItemAddBody,
  assertItemEditBody,
  type ItemKind,
} from '../../src/studio/ai/itemGenerate.js';
import { GatewayError } from './errors.js';
import type { ItemAddRequest, ItemEditRequest } from './requestSchema.js';

export interface ItemGenerationDeps {
  generateItemAdd?: typeof generateItemAddImpl;
  generateItemEdit?: typeof generateItemEditImpl;
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
    const { kind, description } = assertItemAddBody(request);
    const result = await add({ kind, description, packageDir: '' });
    if (!result.ok) {
      throw new GatewayError('generation-error', safeItemError(result.error), requestId, 502);
    }
    return { requestId, ok: true as const, item: result.item };
  }

  const { kind, intent, currentContent, params } = assertItemEditBody(request);
  const result = await edit({ kind, intent, currentContent, params, packageDir: '' });
  if (!result.ok) {
    throw new GatewayError('generation-error', safeItemError(result.error), requestId, 502);
  }
  return { requestId, ok: true as const, items: result.items };
}

function safeItemError(raw: string): string {
  if (/unavailable|not configured|no api key/i.test(raw)) {
    return 'AI is not configured. Add a provider key on the server.';
  }
  return 'The AI provider could not draft this item.';
}

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
