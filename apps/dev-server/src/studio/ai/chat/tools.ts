import {
  generateItemAdd,
  generateItemEdit,
  ItemRequestError,
} from '../itemGenerate';
import type { DraftItem, ItemIntent, ItemIntentParams } from '../types';

export interface ToolCallRequest {
  type: 'draft_new' | 'edit_existing';
  kind: 'lesson' | 'quiz' | 'practice';
  description?: string;
  currentContent?: string;
  intent?: ItemIntent;
  params?: ItemIntentParams;
  packageDir: string;
}

export type ToolCallResult =
  | { ok: true; items: DraftItem[] }
  | { ok: false; error: string };

/**
 * Thin wrappers around generateItemAdd / generateItemEdit for chat tool use.
 * Draft-then-commit: never writes package files.
 */
export async function draftActivity(request: ToolCallRequest): Promise<ToolCallResult> {
  try {
    if (request.type === 'draft_new') {
      const result = await generateItemAdd({
        kind: request.kind,
        description: request.description || `Create a new ${request.kind}`,
        packageDir: request.packageDir,
      });
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      return { ok: true, items: [result.item] };
    }

    const currentContent = request.currentContent;
    if (!currentContent) {
      return { ok: false, error: 'currentContent is required for edit' };
    }

    const result = await generateItemEdit({
      kind: request.kind,
      intent: request.intent || (request.kind === 'practice' ? 'improve-prompt' : 'rewrite'),
      currentContent,
      params: request.params,
      packageDir: request.packageDir,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, items: result.items };
  } catch (err) {
    if (err instanceof ItemRequestError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
