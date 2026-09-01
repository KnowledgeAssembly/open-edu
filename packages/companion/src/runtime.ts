import type { z } from 'zod';

export interface AgentRuntimeToolSpec {
  name: string;
  description: string;
  inputSchema: z.ZodType;
}

export type AgentRuntimeMessage =
  | { role: 'user' | 'assistant' | 'system'; content: string }
  | {
      role: 'assistant';
      content: string;
      toolCalls: Array<{ toolCallId: string; tool: string; input: unknown }>;
    }
  | { role: 'tool'; toolCallId: string; content: string };

export interface AgentRuntimeRequest {
  messages: AgentRuntimeMessage[];
  systemPrompt?: string;
  signal?: AbortSignal;
  maxSteps?: number;
  timeoutMs?: number;
  tools?: AgentRuntimeToolSpec[];
}

export type AgentRuntimeEvent =
  | { type: 'text.delta'; text: string }
  | { type: 'text.complete' }
  | { type: 'tool.call'; toolCallId: string; tool: string; input: unknown }
  | { type: 'error'; error: string };

export interface AgentRuntime {
  run(request: AgentRuntimeRequest): AsyncIterable<AgentRuntimeEvent>;
}
