import { z } from 'zod';

export const PIPILI_CONFIG = {
  MAX_MESSAGES: 50,
  MAX_MESSAGE_LENGTH: 4000,
  MAX_CONTEXT_SIZE: 8000,
  MAX_REQUEST_SIZE_BYTES: 100 * 1024,
  MAX_CONVERSATION_AGE_MS: 24 * 60 * 60 * 1000,
  FAST_MODEL_TIMEOUT_MS: 30_000,
  ESCALATION_MODEL_TIMEOUT_MS: 60_000,
} as const;

// AI SDK v7 UIMessage carries text in a `parts` array (no top-level
// `content`). Some legacy/older clients may still send `content`. Accept both
// so the transport is forgiving; convertToModelMessages enforces the real
// UIMessage shape on the server.
export const pipiliMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
      }),
    )
    .optional(),
  content: z.string().max(PIPILI_CONFIG.MAX_MESSAGE_LENGTH).optional(),
  timestamp: z.number().optional(),
});

export const pipiliContextSchema = z.object({
  page: z
    .object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      nodeType: z.string(),
    })
    .optional(),
  widget: z
    .object({
      id: z.string(),
      type: z.string(),
      state: z.record(z.string(), z.unknown()),
    })
    .optional(),
  lesson: z
    .object({
      id: z.string(),
      title: z.string(),
      objectives: z.array(z.string()),
      topics: z.array(z.string()),
    })
    .optional(),
  module: z
    .object({
      id: z.string(),
      title: z.string(),
      lessons: z.array(z.object({ id: z.string(), title: z.string() })),
    })
    .optional(),
  course: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      subject: z.string(),
      level: z.string(),
      language: z.string(),
    })
    .optional(),
  notes: z
    .object({
      entries: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          content: z.string(),
          createdAt: z.number(),
          pageId: z.string().optional(),
          lessonId: z.string().optional(),
        }),
      ),
      searchQuery: z.string().optional(),
    })
    .optional(),
  assessment: z
    .object({
      isActive: z.boolean(),
      assessmentId: z.string().optional(),
      questionType: z.string().optional(),
      questionText: z.string().optional(),
      maxAttempts: z.number().optional(),
      attemptsUsed: z.number().optional(),
    })
    .optional(),
  learner: z
    .object({
      language: z.string(),
      readingLevel: z.string(),
      accessibilityProfile: z.enum(['autism', 'adhd', 'dyslexia']).optional(),
    })
    .optional(),
  history: z
    .object({
      completedLessons: z.array(z.string()),
      recentPages: z.array(z.object({ pageId: z.string(), timeSpent: z.number() })),
      strengths: z.array(z.string()),
      weakConcepts: z.array(z.string()),
    })
    .optional(),
});

export const pipiliRequestSchema = z.object({
  conversationId: z.string().min(1),
  messages: z.array(pipiliMessageSchema).max(PIPILI_CONFIG.MAX_MESSAGES),
  context: pipiliContextSchema,
});
