import { z } from 'zod';
import type { DraftItem, CourseDraftResult } from '../types';

/** Cap follow-up chips shown under an assistant message (server-suggested). */
export const MAX_SUGGESTED_NEXT_STEPS = 4;

export const suggestedNextStepsSchema = z.array(z.string()).max(MAX_SUGGESTED_NEXT_STEPS);

export const studioChatMetadataSchema = z.object({
  mode: z.enum(['explain', 'draft', 'course_draft']),
  timestamp: z.number(),
  drafts: z.array(z.unknown()).optional(),
  courseDraft: z.unknown().optional(),
  suggestedNextSteps: suggestedNextStepsSchema.optional(),
});

export type StudioChatMetadata = z.infer<typeof studioChatMetadataSchema>;

export interface ChatMetadataOptions {
  drafts?: DraftItem[];
  courseDraft?: CourseDraftResult;
  suggestedNextSteps?: string[];
}

export function createChatMetadata(
  mode: 'explain' | 'draft' | 'course_draft' = 'explain',
  options: ChatMetadataOptions = {},
): StudioChatMetadata {
  return {
    mode,
    timestamp: Date.now(),
    ...(options.drafts?.length ? { drafts: options.drafts } : {}),
    ...(options.courseDraft ? { courseDraft: options.courseDraft } : {}),
    ...(options.suggestedNextSteps?.length
      ? { suggestedNextSteps: options.suggestedNextSteps.slice(0, MAX_SUGGESTED_NEXT_STEPS) }
      : {}),
  };
}
