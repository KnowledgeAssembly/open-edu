import { z } from 'zod';
import { studioContextSnapshotSchema } from './context.js';
import type { AgentRuntimeMessage } from './runtime.js';

/**
 * Canonical wire schema for the Studio author-assistant chat request. Single
 * source of truth shared by the dev-server handler and any client that drives
 * `/api/studio/ai/chat`. Assistant `content` is allowed to be empty: tool-call
 * turns legitimately carry no visible text, and `toAiSdkMessages` normalizes it
 * to a non-null value on the way into the model.
 */
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

/** Map the Companion message model to the AI SDK language-model message shape.
 *  Tool-aware variant (assistant `toolCalls`, `tool` role) becomes structured
 *  `tool-call` / `tool-result` parts so the agent loop can feed results back.
 *  Pure: no `ai` / LLM provider dependency. */
export function toAiSdkMessages(messages: AgentRuntimeMessage[]): Array<Record<string, unknown>> {
  const toolNames = new Map<string, string>();
  for (const message of messages) {
    if (message.role === 'assistant' && 'toolCalls' in message) {
      for (const call of message.toolCalls) {
        toolNames.set(call.toolCallId, call.tool);
      }
    }
  }

  return messages.map((message) => {
    if (message.role === 'assistant' && 'toolCalls' in message) {
      // Keep a non-empty text part so OpenAI-compatible providers don't
      // serialize this turn's `content` as null (some reject null content).
      const text = message.content?.trim()
        ? message.content
        : `Tool call: ${message.toolCalls.map((call) => call.tool).join(', ')}`;
      const content: Array<Record<string, unknown>> = [{ type: 'text', text }];
      for (const call of message.toolCalls) {
        content.push({
          type: 'tool-call',
          toolCallId: call.toolCallId,
          toolName: call.tool,
          input: call.input,
        });
      }
      return { role: 'assistant', content };
    }
    if (message.role === 'tool') {
      return {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: message.toolCallId,
            toolName: toolNames.get(message.toolCallId) ?? 'tool',
            output: { type: 'text', value: message.content },
          },
        ],
      };
    }
    // Plain messages. Assistant turns that only carried tool calls (e.g. a prior
    // tool-call turn in the conversation history) arrive with empty text; a
    // provider serializes assistant `content` as `text || null`, so an empty
    // string becomes `null` which OpenAI-compatible endpoints reject. Keep the
    // content non-empty to stay valid across providers.
    if (message.role === 'assistant') {
      const text = message.content?.trim() ? message.content : ' ';
      return { role: 'assistant', content: text };
    }
    return { role: message.role, content: message.content ?? '' };
  });
}

export type ChatUIMessageInput = {
  role?: string;
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
};

/** Reverse of `toAiSdkMessages` for the wire shape: extract the displayable
 *  text from an AI SDK v7 `UIMessage`-shaped object. Joins `parts[]` `text`
 *  chunks when present, else falls back to `content`. Tool-call turns carry
 *  empty content (the server re-normalizes via `toAiSdkMessages`). */
export function fromUIMessage(msg: ChatUIMessageInput): {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
} {
  const role = (msg.role ?? 'user') as 'user' | 'assistant' | 'system' | 'tool';
  if (msg.parts?.length) {
    const text = msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
    return { role, content: text };
  }
  return { role, content: msg.content ?? '' };
}
