import { z } from 'zod';
import { studioContextSnapshotSchema } from '../../src/studio/ai/context.js';

export const MAX_NOTES_CHARS = 200_000;
export const MAX_SPEC_CHARS = 10_000_000;
export const MAX_ITEM_DESCRIPTION_CHARS = 20_000;
export const MAX_ITEM_CONTENT_CHARS = 10_000_000;
export const MAX_CHAT_MESSAGES = 50;
export const MAX_CHAT_MESSAGE_CHARS = 10_000;
export const MAX_CHAT_CONTEXT_CHARS = 15_000;
export const MAX_REQUEST_BODY_BYTES = 10_000_000;
export const MAX_RESPONSE_BYTES = 10_000_000;
export const MAX_GENERATED_FILES = 500;
export const ALLOWED_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
];

const contentTypeSchema = z.enum(['application/json', 'text/markdown']);

export const generateDraftRequestSchema = z
  .object({
    notes: z.string().max(MAX_NOTES_CHARS).optional(),
    spec: z.string().max(MAX_SPEC_CHARS).optional(),
    specExt: z.enum(['.json', '.md']).optional(),
    contentType: contentTypeSchema.optional(),
  })
  .refine(
    (body) => (body.notes ? 1 : 0) + (body.spec ? 1 : 0) === 1,
    'Provide exactly one of notes or spec',
  );

export type GenerateDraftRequest = z.infer<typeof generateDraftRequestSchema>;

export const itemAddRequestSchema = z.object({
  kind: z.enum(['lesson', 'quiz', 'practice']),
  description: z.string().min(1).max(MAX_ITEM_DESCRIPTION_CHARS),
});

export type ItemAddRequest = z.infer<typeof itemAddRequestSchema>;

const itemIntentSchema = z.enum([
  'rewrite',
  'expand',
  'fix-quality',
  'difficulty',
  'translate',
  'add-questions',
  'improve-prompt',
]);

export const itemEditRequestSchema = z.object({
  kind: z.enum(['lesson', 'quiz', 'practice']),
  intent: itemIntentSchema,
  currentContent: z.string().min(1).max(MAX_ITEM_CONTENT_CHARS),
  params: z
    .object({
      targetLocale: z.string().optional(),
      direction: z.enum(['easier', 'harder']).optional(),
    })
    .optional(),
});

export type ItemEditRequest = z.infer<typeof itemEditRequestSchema>;

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(MAX_CHAT_MESSAGE_CHARS),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  messages: z.array(chatMessageSchema).max(MAX_CHAT_MESSAGES),
  context: studioContextSnapshotSchema.optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface GatewayFile {
  path: string;
  /** Base64-encoded bytes for JSON transport. */
  content: string;
  encoding: 'utf8' | 'base64';
}

export interface DraftFileEntry {
  path: string;
  /** Decoded text for UTF-8 files; base64 for binary files. */
  content: string;
  encoding: 'utf8' | 'base64';
}

export const generateDraftResponseSchema = z.object({
  requestId: z.string(),
  success: z.literal(true),
  title: z.string(),
  version: z.string().optional(),
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
        encoding: z.enum(['utf8', 'base64']),
      }),
    )
    .min(1),
  outlinePreview: z.array(z.object({ title: z.string(), kind: z.string() })),
  quality: z.array(
    z.object({
      id: z.string(),
      labelKey: z.string(),
      passed: z.boolean(),
      detail: z.string().optional(),
    }),
  ),
});

export type GenerateDraftResponse = z.infer<typeof generateDraftResponseSchema>;

export const statusResponseSchema = z.object({
  requestId: z.string(),
  available: z.boolean(),
  reason: z.string().optional(),
});

export type StatusResponse = z.infer<typeof statusResponseSchema>;
