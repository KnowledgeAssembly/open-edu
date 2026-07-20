import { z } from 'zod';
import { SkillsSchema } from './manifest.js';
import { RemoteWidgetManifestSchema } from './widget-manifest.js';
import { localizedField } from './localized.js';

const OptionSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().min(1).max(1024),
  correct: z.boolean(),
});

const QuizConfigSchema = z.object({
  question: z.string().min(1).max(2048),
  options: z.array(OptionSchema).min(2).max(26),
});

const ReflectionConfigSchema = z.object({
  prompt: z.string().min(1).max(4096),
});

const WidgetConfigSchema = z.object({
  widget: z.string().min(1).max(256),
  version: z.string().min(1).max(64).optional(),
  config: z.record(z.unknown()).optional(),
});

const ExerciseConfigSchema = z.object({
  widget: z.string().min(1).max(256).optional(),
  config: z.record(z.unknown()).optional(),
});

const NodeFields = {
  title: localizedField(256).optional(),
  skills: SkillsSchema.optional(),
} as const;

export const LessonNodeSchema = z.object({
  type: z.literal('lesson'),
  ...NodeFields,
});

export const QuizNodeSchema = z.object({
  type: z.literal('quiz'),
  ...NodeFields,
  ...QuizConfigSchema.shape,
});

export const ReflectionNodeSchema = z.object({
  type: z.literal('reflection'),
  ...NodeFields,
  ...ReflectionConfigSchema.shape,
});

export const ExerciseNodeSchema = z.object({
  type: z.literal('exercise'),
  ...NodeFields,
  ...ExerciseConfigSchema.shape,
});

export const WidgetNodeSchema = z.object({
  type: z.literal('custom'),
  ...NodeFields,
  ...WidgetConfigSchema.shape,
  remoteWidget: RemoteWidgetManifestSchema.optional(),
});

export const ContentNodeSchema = z.discriminatedUnion('type', [
  LessonNodeSchema,
  QuizNodeSchema,
  ReflectionNodeSchema,
  ExerciseNodeSchema,
  WidgetNodeSchema,
]);

export type ContentNode = z.infer<typeof ContentNodeSchema>;
export type LessonNode = z.infer<typeof LessonNodeSchema>;
export type QuizNode = z.infer<typeof QuizNodeSchema>;
export type ReflectionNode = z.infer<typeof ReflectionNodeSchema>;
export type ExerciseNode = z.infer<typeof ExerciseNodeSchema>;
export type WidgetNode = z.infer<typeof WidgetNodeSchema>;
export type NodeType = ContentNode['type'];

export const NodeTypeSchema = z.enum(['lesson', 'quiz', 'reflection', 'exercise', 'custom']);
