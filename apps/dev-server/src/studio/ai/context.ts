import { z } from 'zod';

export const StudioViewSchema = z.enum([
  'home',
  'outline',
  'edit-activity',
  'preview',
  'share',
  'library',
  'unit-builder',
  'ai-review',
]);

export type StudioView = z.infer<typeof StudioViewSchema>;

export const ActivityKindSchema = z.enum([
  'lesson',
  'quiz',
  'practice',
  'reflection',
  'other',
]);

export type ActivityKind = z.infer<typeof ActivityKindSchema>;

export const studioContextSnapshotSchema = z.object({
  view: StudioViewSchema,
  locale: z.string(),
  aiAvailable: z.boolean(),
  course: z.object({
    id: z.string(),
    title: z.string(),
    activityCount: z.number(),
    outline: z.array(
      z.object({
        title: z.string(),
        kind: ActivityKindSchema,
        path: z.string(),
      })
    ),
  }).optional(),
  activity: z.object({
    path: z.string(),
    kind: ActivityKindSchema,
    title: z.string().optional(),
    contentExcerpt: z.string().optional(),
  }).optional(),
});

export type StudioContextSnapshot = z.infer<typeof studioContextSnapshotSchema>;

export function truncateExcerpt(text: string, limit = 4000): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '... [truncated]';
}

export function buildOutlineSummary(
  activities: Array<{ title?: string; kind?: string; path: string }>,
  limit = 30,
) {
  return activities.slice(0, limit).map((a) => {
    const kindParse = ActivityKindSchema.safeParse(a.kind);
    return {
      title: a.title || 'Untitled',
      kind: kindParse.success ? kindParse.data : ('other' as const),
      path: a.path,
    };
  });
}
