import { z } from 'zod';

export const AssetSchema = z.object({
  id: z.string(),
  path: z.string(),
  type: z.enum(['image', 'video', 'audio', 'pdf', 'embed']),
  description: z.string().optional(),
  placeholderGenerated: z.boolean().default(false),
}).strict();

export type Asset = z.infer<typeof AssetSchema>;

export const LearningObjectiveSchema = z.object({
  id: z.string(),
  description: z.string(),
  bloomLevel: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).optional(),
  skills: z.array(z.string()).optional(),
}).strict();

export type LearningObjective = z.infer<typeof LearningObjectiveSchema>;

export const GlossaryEntrySchema = z.object({
  term: z.string(),
  definition: z.string(),
}).strict();

export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const ReferenceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  citation: z.string().optional(),
}).strict();

export type Reference = z.infer<typeof ReferenceSchema>;

const MultipleChoiceOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  correct: z.boolean(),
}).strict();

export const MultipleChoiceQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('multiple-choice'),
  prompt: z.string(),
  options: z.array(MultipleChoiceOptionSchema).min(2),
  explanation: z.string().optional(),
}).strict();

export const TrueFalseQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('true-false'),
  prompt: z.string(),
  correctAnswer: z.boolean(),
  explanation: z.string().optional(),
}).strict();

export const ShortAnswerQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('short-answer'),
  prompt: z.string(),
  sampleAnswer: z.string().optional(),
  keywords: z.array(z.string()).optional(),
}).strict();

export const FillBlankQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('fill-blank'),
  template: z.string(),
  answer: z.string(),
  alternatives: z.array(z.string()).optional(),
}).strict();

export const QuestionSchema = z.discriminatedUnion('type', [
  MultipleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
  ShortAnswerQuestionSchema,
  FillBlankQuestionSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;

export const QuizSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  timeLimit: z.number().optional(),
  passingScore: z.number().min(0).max(100).optional(),
  questions: z.array(QuestionSchema).min(1),
  shuffleQuestions: z.boolean().default(false),
}).strict();

export type Quiz = z.infer<typeof QuizSchema>;

export const ReadingActivitySchema = z.object({
  id: z.string(),
  type: z.literal('reading'),
  content: z.string(),
  duration: z.number().optional(),
}).strict();

export const ExerciseActivitySchema = z.object({
  id: z.string(),
  type: z.literal('exercise'),
  instructions: z.string(),
  solution: z.string().optional(),
  starterCode: z.string().optional(),
}).strict();

export const DiscussionActivitySchema = z.object({
  id: z.string(),
  type: z.literal('discussion'),
  prompt: z.string(),
  guidedQuestions: z.array(z.string()).optional(),
}).strict();

export const ReflectionActivitySchema = z.object({
  id: z.string(),
  type: z.literal('reflection'),
  prompt: z.string(),
  private: z.boolean().default(true),
}).strict();

export const VideoActivitySchema = z.object({
  id: z.string(),
  type: z.literal('video'),
  url: z.string(),
  transcript: z.string().optional(),
  duration: z.number().optional(),
}).strict();

export const ActivitySchema = z.discriminatedUnion('type', [
  ReadingActivitySchema,
  ExerciseActivitySchema,
  DiscussionActivitySchema,
  ReflectionActivitySchema,
  VideoActivitySchema,
]);

export type Activity = z.infer<typeof ActivitySchema>;

export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  objectives: z.array(LearningObjectiveSchema).min(1),
  content: z.string(),
  activities: z.array(ActivitySchema).optional(),
  quiz: QuizSchema.optional(),
  assets: z.array(AssetSchema).optional(),
  glossary: z.array(GlossaryEntrySchema).optional(),
  references: z.array(ReferenceSchema).optional(),
  estimatedMinutes: z.number().optional(),
}).strict();

export type Lesson = z.infer<typeof LessonSchema>;

export const CourseModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  objectives: z.array(LearningObjectiveSchema).optional(),
  lessons: z.array(LessonSchema),
  prerequisites: z.array(z.string()).optional(),
  estimatedHours: z.number().optional(),
}).strict();

export type CourseModule = z.infer<typeof CourseModuleSchema>;

export const CourseMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  author: z.string().optional(),
  version: z.string().optional(),
  language: z.string().default('en'),
  keywords: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedHours: z.number().optional(),
  lastUpdated: z.string().optional(),
}).strict();

export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;

export const CourseModelSchema = z.object({
  metadata: CourseMetadataSchema,
  modules: z.array(CourseModuleSchema).min(1),
  globalGlossary: z.array(GlossaryEntrySchema).optional(),
  globalReferences: z.array(ReferenceSchema).optional(),
}).strict();

export type CourseModel = z.infer<typeof CourseModelSchema>;
