import { z } from 'zod';
import { studioContextSnapshotSchema } from '../context';

export const StudioChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  context: studioContextSnapshotSchema,
});

export type StudioChatRequest = z.infer<typeof StudioChatRequestSchema>;

export const MAX_CONTEXT_CHARS = 15000;
export const MAX_MESSAGES = 50;
export const MAX_REQUEST_SIZE_BYTES = 1_000_000;
