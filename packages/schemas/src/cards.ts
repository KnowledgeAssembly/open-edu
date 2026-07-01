import { z } from 'zod';
import { RewardConditionSchema } from './rewards.js';

export const CardTypeSchema = z.enum([
  'knowledge',
  'skill',
  'achievement',
  'exploration',
  'mentor',
]);

export const CardDifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const CardDefinitionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  category: z.string().min(1),
  type: CardTypeSchema,
  icon: z.string().optional(),
  illustration: z.string().optional(),
  summary: z.string().min(1),
  detailedExplanation: z.string().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: CardDifficultySchema.optional(),
  level: z.number().int().min(1).max(5).default(1),
  maximumLevel: z.number().int().min(1).max(5).default(1),
  unlock: RewardConditionSchema,
  nextLevel: RewardConditionSchema.optional(),
  relatedLessons: z.array(z.string()).optional(),
  relatedQuizzes: z.array(z.string()).optional(),
  relatedVideos: z.array(z.string()).optional(),
  relatedProjects: z.array(z.string()).optional(),
  audioNarration: z.string().optional(),
});

export const CardDefinitionsSchema = z.object({
  cards: z.array(CardDefinitionSchema),
});

export type CardType = z.infer<typeof CardTypeSchema>;
export type CardDifficulty = z.infer<typeof CardDifficultySchema>;
export type CardDefinition = z.infer<typeof CardDefinitionSchema>;
export type CardDefinitions = z.infer<typeof CardDefinitionsSchema>;
