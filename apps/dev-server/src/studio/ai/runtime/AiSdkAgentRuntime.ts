import { streamText } from 'ai';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import { toAiSdkMessages } from '@open-edu/companion/chat';
import type { AgentRuntime, AgentRuntimeEvent, AgentRuntimeRequest } from '@open-edu/companion';

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
 *  only ever reached through this contract; the Studio AI middleware (local
 *  and browser modes) share it. The model call is performed eagerly so that
 *  synchronous configuration/provider failures surface immediately (surfacing
 *  as a 500) rather than bubbling out of the stream iteration. */
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
