import { streamText } from 'ai';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import type { AgentRuntime, AgentRuntimeEvent, AgentRuntimeRequest } from '@open-edu/companion';

/** Initial `AgentRuntime`: wraps the AI SDK `streamText` call. Model execution is
 *  only ever reached through this contract; LocalCompanionClient and the hosted
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
      messages: request.messages as never,
      abortSignal: request.signal,
    });

    return {
      async *[Symbol.asyncIterator]() {
        for await (const part of result.stream) {
          if (part.type === 'text-delta') {
            yield { type: 'text.delta', text: part.text };
          }
        }
        yield { type: 'text.complete' };
      },
    };
  }
}
