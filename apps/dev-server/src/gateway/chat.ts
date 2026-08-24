import { completeWithLlm } from '../studio/ai/studioLlm.js';
import { buildSystemPrompt } from '../studio/ai/chat/policy.js';
import { studioChatMessage } from '../studio/ai/chat/messages.js';
import type { StudioContextSnapshot } from '../studio/ai/context.js';
import { GatewayError, classifyGatewayError } from './errors.js';
import type { ChatRequest } from './requestSchema.js';
import { MAX_CHAT_CONTEXT_CHARS } from './requestSchema.js';

export interface ChatDeps {
  completeText?: (prompt: string, signal?: AbortSignal) => Promise<string>;
}

export interface GatewayChatResult {
  requestId: string;
  terminal: 'finished' | 'error';
  content?: string;
  error?: string;
  suggestion?: string;
}

function buildPrompt(request: ChatRequest): string {
  const snapshot: StudioContextSnapshot = request.context ?? {
    view: 'outline',
    locale: 'en',
    aiAvailable: true,
  };

  const messages = request.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  return [buildSystemPrompt(snapshot), messages].filter(Boolean).join('\n\n');
}

/**
 * Stateless chat for the hosted gateway. It validates the message/context
 * contract, runs a single bounded completion, and returns one deterministic
 * terminal event (finished or error). The browser keeps its own conversation
 * state, so no server-side session is created.
 */
export async function gatewayChat(
  request: ChatRequest,
  requestId: string,
  deps: ChatDeps = {},
  signal?: AbortSignal,
): Promise<GatewayChatResult> {
  const completeText = deps.completeText ?? completeWithLlm;
  const lastUser = [...request.messages].reverse().find((m) => m.role === 'user');

  try {
    const prompt = buildPrompt(request);
    if (prompt.length > MAX_CHAT_CONTEXT_CHARS) {
      throw new GatewayError(
        'payload-too-large',
        'Context exceeds the size limit. Try a shorter conversation.',
        requestId,
        413,
      );
    }
    const text = await completeText(prompt, signal);
    if (!lastUser) {
      throw new GatewayError('invalid-request', 'No user message found', requestId);
    }
    return { requestId, terminal: 'finished', content: text };
  } catch (err) {
    if (err instanceof GatewayError) throw err;
    const { message } = classifyGatewayError(requestId, err);
    return {
      requestId,
      terminal: 'error',
      error: studioChatMessage('assistant.chat.serverError', 'en'),
      suggestion: message,
    };
  }
}
