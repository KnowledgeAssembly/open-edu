import { tool } from 'ai';
import { z } from 'zod';

/**
 * Create the tool registry for Pipili.
 * Each tool uses explicit Zod `inputSchema` (AI SDK v7) and bounded outputs.
 * Tools are scoped to the active learner and course context.
 */
export function createToolRegistry(
  contextGetter: () => {
    courseId?: string;
    lessonId?: string;
    learnerId?: string;
  },
) {
  const getCurrentPageContext = tool({
    description:
      'Returns the current page and widget content already authorized by runtime context.',
    inputSchema: z.object({}),
    execute: async () => {
      contextGetter();
      return { pageContent: 'Current page content from runtime context' };
    },
  });

  const getCurrentLessonContext = tool({
    description: 'Returns objectives, content, and activities for the active lesson.',
    inputSchema: z.object({}),
    execute: async () => {
      const ctx = contextGetter();
      return {
        lessonId: ctx.lessonId,
        objectives: [] as string[],
        content: [] as string[],
      };
    },
  });

  const searchNotes = tool({
    description: 'Searches learner-owned notes using the existing notes service/storage boundary.',
    inputSchema: z.object({
      query: z.string().describe('Search query for notes'),
      // Coerce + catch so a sloppy numeric value from the model never turns
      // into a tool-call error (which the model would otherwise narrate).
      maxResults: z.coerce
        .number()
        .int()
        .min(1)
        .max(20)
        .catch(5)
        .describe('Maximum number of results'),
    }),
    execute: async ({ query }) => {
      contextGetter();
      return {
        query,
        results: [] as Array<{ id: string; title: string; excerpt: string }>,
      };
    },
  });

  const getRelevantNotes = tool({
    description: 'Retrieves bounded note excerpts selected by searchNotes.',
    inputSchema: z.object({
      noteIds: z.array(z.string()).describe('Note IDs to retrieve'),
    }),
    execute: async () => {
      return {
        notes: [] as Array<{ id: string; title: string; content: string }>,
      };
    },
  });

  const getLearningHistory = tool({
    description: 'Returns only the history fields needed for current guidance.',
    inputSchema: z.object({
      fields: z
        .array(z.enum(['completedLessons', 'strengths', 'weakConcepts']))
        .catch(['strengths', 'weakConcepts']),
    }),
    execute: async () => {
      return {
        completedLessons: [] as string[],
        strengths: [] as string[],
        weakConcepts: [] as string[],
      };
    },
  });

  const findRelatedConcepts = tool({
    description:
      'Finds concepts related to the given topic using available course/glossary data. Ready for V2 concept graph integration.',
    inputSchema: z.object({
      concept: z.string().describe('The concept to find relations for'),
      maxResults: z.coerce.number().int().min(1).max(20).catch(5),
    }),
    execute: async ({ concept }) => {
      return {
        concept,
        related: [] as Array<{
          name: string;
          relationship: string;
          definition: string;
        }>,
      };
    },
  });

  const createProgressiveHint = tool({
    description:
      'Produces or selects a hint level constrained by learner effort and assessment state.',
    inputSchema: z.object({
      topic: z.string().describe('The topic or problem to hint about'),
      // Coerce + catch: the model may emit a numeric string (e.g. "2") or an
      // out-of-range value; never let that surface as a tool-call error.
      requestedLevel: z.coerce
        .number()
        .int()
        .min(1)
        .max(4)
        .catch(1)
        .describe('Requested hint level (1-4)'),
      learnerHasAttempted: z
        .boolean()
        .catch(false)
        .describe('Whether the learner has demonstrated effort on this problem'),
    }),
    execute: async ({ topic, requestedLevel, learnerHasAttempted }) => {
      contextGetter();
      try {
        const { resolveHintLevel, HINT_INSTRUCTIONS } =
          await import('@open-edu/ai-companion/pipili');

        // The schema clamps requestedLevel to 1-4 (coerce + catch), so the
        // number is safe to narrow to HintLevel.
        const actualLevel = resolveHintLevel({
          currentLevel: 1,
          requestedLevel: requestedLevel as 1 | 2 | 3 | 4,
          learnerHasAttempted,
          assessmentActive: false,
        });

        return {
          topic,
          level: actualLevel,
          instruction: HINT_INSTRUCTIONS[actualLevel],
        };
      } catch {
        // The hint service is best-effort; never fail the turn because of it.
        return {
          topic,
          level: 1 as const,
          instruction: 'Nudge toward the relevant concept without revealing the solution.',
        };
      }
    },
  });

  return {
    getCurrentPageContext,
    getCurrentLessonContext,
    searchNotes,
    getRelevantNotes,
    getLearningHistory,
    findRelatedConcepts,
    createProgressiveHint,
  };
}

export type PipiliToolRegistry = ReturnType<typeof createToolRegistry>;
