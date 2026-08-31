import type { UIMessageChunk } from 'ai';
import type { AgentRuntimeEvent } from '@open-edu/companion';

export interface RuntimeToUIMessageOptions {
  textId?: string;
  messageMetadata?: () => Record<string, unknown> | undefined;
  onComplete?: () => void;
  onError?: (message: string) => string;
}

/** Map an `AgentRuntimeEvent` stream into the AI SDK UI message chunk shape.
 *  `text.delta` → text-delta; `text.complete` fires the onComplete callback;
 *  `error` becomes a localized text-delta. */
export function agentRuntimeEventsToUIMessageStream(
  events: AsyncIterable<AgentRuntimeEvent>,
  options: RuntimeToUIMessageOptions = {},
): ReadableStream<UIMessageChunk> {
  const textId = options.textId ?? `runtime-${Date.now()}-text`;
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      controller.enqueue({ type: 'start' });
      controller.enqueue({ type: 'text-start', id: textId });
      try {
        for await (const event of events) {
          if (event.type === 'text.delta') {
            controller.enqueue({ type: 'text-delta', id: textId, delta: event.text });
          } else if (event.type === 'text.complete') {
            options.onComplete?.();
          } else if (event.type === 'error') {
            controller.enqueue({
              type: 'text-delta',
              id: textId,
              delta: options.onError ? options.onError(event.error) : event.error,
            });
          }
        }
      } catch {
        controller.enqueue({
          type: 'text-delta',
          id: textId,
          delta: options.onError ? options.onError('Unexpected error') : 'Unexpected error',
        });
      }
      controller.enqueue({ type: 'text-end', id: textId });
      const metadata = options.messageMetadata?.();
      controller.enqueue({
        type: 'finish',
        finishReason: 'stop',
        ...(metadata ? { messageMetadata: metadata } : {}),
      } as UIMessageChunk);
      controller.close();
    },
  });
}
