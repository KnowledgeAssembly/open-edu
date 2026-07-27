import { z } from 'zod';

export type PipiliMode = 'tutor' | 'coach' | 'reflection' | 'navigator' | 'accessibility';

export interface Citation {
  source: string;
  text: string;
  type: 'lesson' | 'course' | 'note' | 'glossary';
  referenceId?: string;
}

export interface PipiliResponseMetadata {
  mode: PipiliMode;
  citations: Citation[];
  hintLevel?: 1 | 2 | 3 | 4;
  assessmentSafe: boolean;
  suggestedNextSteps: string[];
}

export const citationSchema = z.object({
  source: z.string(),
  text: z.string(),
  type: z.enum(['lesson', 'course', 'note', 'glossary']),
  referenceId: z.string().optional(),
});

export const pipiliResponseMetadataSchema = z.object({
  mode: z.enum(['tutor', 'coach', 'reflection', 'navigator', 'accessibility']),
  citations: z.array(citationSchema),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  assessmentSafe: z.boolean(),
  suggestedNextSteps: z.array(z.string()),
});
