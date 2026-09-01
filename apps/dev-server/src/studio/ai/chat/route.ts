import type { StudioContextSnapshot } from '@open-edu/companion/context';
import type { ItemIntent, ItemIntentParams } from '@open-edu/companion/types';
import type { ParsedIntent } from './intent.js';

export type RoutedTool =
  | { tool: 'generate_course'; description: string }
  | { tool: 'generate_item'; kind: 'lesson' | 'quiz' | 'practice'; description: string }
  | {
      tool: 'edit_item';
      kind: 'lesson' | 'quiz' | 'practice';
      intent: ItemIntent;
      currentContent: string;
      params?: ItemIntentParams;
    }
  | { tool: 'explain' };

/**
 * Map a parsed intent + current Studio context to a single tool invocation.
 * Returns the `explain` fallback when no tool applies. Pure and deterministic:
 * consumed by the Studio AI middleware which handles both local and browser
 * mode so the two never disagree about which tool an intent triggers.
 */
export function routeIntent(
  intent: ParsedIntent | null,
  context: StudioContextSnapshot,
): RoutedTool {
  if (!intent || intent.type === 'explain') return { tool: 'explain' };

  if (intent.type === 'generate_course') {
    return { tool: 'generate_course', description: intent.description ?? '' };
  }

  if (intent.type === 'draft_new' && intent.kind) {
    return {
      tool: 'generate_item',
      kind: intent.kind,
      description: intent.description || `Create a ${intent.kind}`,
    };
  }

  if (intent.type === 'edit_existing' && context.activity) {
    const kind =
      context.activity.kind === 'other'
        ? ('lesson' as const)
        : (context.activity.kind as 'lesson' | 'quiz' | 'practice');
    return {
      tool: 'edit_item',
      kind,
      intent: intent.intent || 'rewrite',
      currentContent: context.activity.contentExcerpt || '',
      params: intent.params,
    };
  }

  return { tool: 'explain' };
}
