import { z } from 'zod';
import type { CompanionTool } from '@open-edu/companion';
import { draftActivity, generateCourseDraftTool } from './tools.js';
import type { ToolCallRequest, GenerateCourseRequest } from './tools.js';

export const generateCourseInput = z.object({
  notes: z.string(),
  packageDir: z.string(),
});

export const generateItemInput = z.object({
  kind: z.enum(['lesson', 'quiz', 'practice']),
  description: z.string(),
  packageDir: z.string(),
});

export const editItemInput = z.object({
  kind: z.enum(['lesson', 'quiz', 'practice']),
  intent: z.string(),
  currentContent: z.string(),
  params: z.unknown().optional(),
  packageDir: z.string(),
});

export const companionToolCatalog: CompanionTool[] = [
  {
    id: 'generate_course',
    description: 'Generate a full course draft from author notes.',
    inputSchema: generateCourseInput,
    permission: { id: 'course.generate', kind: 'propose' },
    async execute(input, ctx) {
      const req = input as { notes: string; packageDir: string };
      const result = await generateCourseDraftTool({
        notes: req.notes,
        packageDir: req.packageDir,
        completeText: async (prompt) => {
          void prompt;
          void ctx;
          throw new Error('completeText must be injected by the caller');
        },
      } as GenerateCourseRequest);
      return result.ok
        ? { ok: true as const, value: result.courseDraft }
        : { ok: false as const, error: result.error };
    },
  },
  {
    id: 'generate_item',
    description: 'Draft a new lesson, quiz, or practice item.',
    inputSchema: generateItemInput,
    permission: { id: 'item.generate', kind: 'propose' },
    async execute(input) {
      const req = input as {
        kind: 'lesson' | 'quiz' | 'practice';
        description: string;
        packageDir: string;
      };
      const result = await draftActivity({
        type: 'draft_new',
        kind: req.kind,
        description: req.description,
        packageDir: req.packageDir,
      } satisfies ToolCallRequest);
      return result.ok
        ? { ok: true as const, value: result.items }
        : { ok: false as const, error: result.error };
    },
  },
  {
    id: 'edit_item',
    description: 'Edit an existing activity (rewrite, translate, adjust difficulty, …).',
    inputSchema: editItemInput,
    permission: { id: 'item.edit', kind: 'propose' },
    async execute(input) {
      const req = input as {
        kind: 'lesson' | 'quiz' | 'practice';
        intent: ToolCallRequest['intent'];
        currentContent: string;
        params?: ToolCallRequest['params'];
        packageDir: string;
      };
      const result = await draftActivity({
        type: 'edit_existing',
        kind: req.kind,
        intent: req.intent ?? 'rewrite',
        currentContent: req.currentContent,
        params: req.params,
        packageDir: req.packageDir,
      } satisfies ToolCallRequest);
      return result.ok
        ? { ok: true as const, value: result.items }
        : { ok: false as const, error: result.error };
    },
  },
];
