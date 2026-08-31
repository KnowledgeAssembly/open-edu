import type { UIMessageChunk } from 'ai';
import type { CompanionTransportEvent } from './CompanionClient.js';

/**
 * The single place where the domain event model (spec §7) is mapped to AI SDK UI
 * message chunks. `message.delta` → text-delta; the private `ui.finish` bridge
 * restores the underlying transport's finish metadata (drafts / courseDraft).
 * All remaining CompanionEvents are no-ops for the current UI (retained for
 * later phases).
 */
export function companionEventsToUIMessageChunks(
  events: AsyncIterable<CompanionTransportEvent>,
): ReadableStream<UIMessageChunk> {
  const textId = `companion-${Date.now()}-text`;
  const messageId = `companion-${Date.now()}`;
  let finishMetadata: Record<string, unknown> | undefined;
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      controller.enqueue({ type: 'start', messageId });
      controller.enqueue({ type: 'text-start', id: textId });
      try {
        for await (const event of events) {
          if (event.type === 'message.delta') {
            controller.enqueue({ type: 'text-delta', id: textId, delta: event.text });
          } else if (event.type === 'ui.finish') {
            finishMetadata = event.messageMetadata;
          }
        }
      } catch {
        // downstream onError handles surfacing
      }
      controller.enqueue({ type: 'text-end', id: textId });
      controller.enqueue({
        type: 'finish',
        finishReason: 'stop',
        ...(finishMetadata ? { messageMetadata: finishMetadata } : {}),
      } as UIMessageChunk);
      controller.close();
    },
  });
}
