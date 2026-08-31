export interface AgentRuntimeRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  systemPrompt?: string;
  signal?: AbortSignal;
  maxSteps?: number;
  timeoutMs?: number;
}

export type AgentRuntimeEvent =
  | { type: 'text.delta'; text: string }
  | { type: 'text.complete' }
  | { type: 'tool.call'; toolCallId: string; tool: string; input: unknown }
  | { type: 'error'; error: string };

export interface AgentRuntime {
  run(request: AgentRuntimeRequest): AsyncIterable<AgentRuntimeEvent>;
}
