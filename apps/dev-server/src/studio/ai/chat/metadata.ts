import type { DraftItem, CourseDraftResult } from '../types';

export interface StudioChatMetadata {
  mode: 'explain' | 'draft' | 'course_draft';
  timestamp: number;
  drafts?: DraftItem[];
  courseDraft?: CourseDraftResult;
  suggestedNextSteps?: string[];
}

export function createChatMetadata(
  mode: 'explain' | 'draft' | 'course_draft' = 'explain',
): StudioChatMetadata {
  return {
    mode,
    timestamp: Date.now(),
  };
}
