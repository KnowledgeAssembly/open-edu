import { streamText } from 'ai';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import type {
  AgentRuntime,
  AgentRuntimeEvent,
  AgentRuntimeMessage,
  AgentRuntimeRequest,
} from '@open-edu/companion';

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Map the Companion message model to the AI SDK language-model message shape.
 *  Tool-aware variant (assistant `toolCalls`, `tool` role) becomes structured
 *  `tool-call` / `tool-result` parts so the agent loop can feed results back. */
function toAiSdkMessages(messages: AgentRuntimeMessage[]): Array<Record<string, unknown>> {
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
      const content: Array<Record<string, unknown>> = [];
      if (message.content) {
        content.push({ type: 'text', text: message.content });
      }
      for (const call of message.toolCalls) {
        content.push({
          type: 'tool-call',
          toolCallId: call.toolCallId,
          toolName: call.tool,
          args: call.input,
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
            result: message.content,
          },
        ],
      };
    }
    return { role: message.role, content: message.content };
  });
}

function toAiSdkTools(
  tools: NonNullable<AgentRuntimeRequest['tools']>,
): Record<string, { description: string; parameters: unknown }> {
  return Object.fromEntries(
    tools.map((tool) => [
      tool.name,
      { description: tool.description, parameters: tool.inputSchema },
    ]),
  );
}

type ToolCallStreamPart = { toolCallId: string; toolName: string; input: unknown };

/** Initial `AgentRuntime`: wraps the AI SDK `streamText` call. Model execution is
 *  only ever reached through this contract; the local chat handler and hosted
 *  gateway share it. The model call is performed eagerly so that synchronous
 *  configuration/provider failures surface immediately (surfacing as a 500)
 *  rather than bubbling out of the stream iteration. */
export class AiSdkAgentRuntime implements AgentRuntime {
  run(request: AgentRuntimeRequest): AsyncIterable<AgentRuntimeEvent> {
    const factory = createModelFactoryFromEnv();
    const model = factory.getModel('fast');

    const result = streamText({
      model,
      system: request.systemPrompt,
      messages: toAiSdkMessages(request.messages) as never,
      tools: request.tools?.length ? (toAiSdkTools(request.tools) as never) : undefined,
      abortSignal: request.signal,
    });

    return {
      async *[Symbol.asyncIterator]() {
        for await (const part of result.stream) {
          if (part.type === 'text-delta') {
            yield { type: 'text.delta', text: part.text };
          } else if (part.type === 'tool-call') {
            const call = part as unknown as ToolCallStreamPart;
            yield {
              type: 'tool.call',
              toolCallId: call.toolCallId,
              tool: call.toolName,
              input: call.input,
            };
          } else if (part.type === 'error') {
            yield { type: 'error', error: messageFromError(part.error) };
          }
        }
        yield { type: 'text.complete' };
      },
    };
  }
}
