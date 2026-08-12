import type { DraftItem } from '../types';

export interface StudioChatMetadata {
  mode: 'explain' | 'draft';
  timestamp: number;
  drafts?: DraftItem[];
  suggestedNextSteps?: string[];
}

export function createChatMetadata(mode: 'explain' | 'draft' = 'explain'): StudioChatMetadata {
  return {
    mode,
    timestamp: Date.now(),
  };
}
