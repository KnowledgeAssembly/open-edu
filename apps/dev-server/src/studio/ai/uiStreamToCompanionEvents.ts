import type { UIMessageChunk } from 'ai';
import type { CompanionTransportEvent } from './CompanionClient.js';

/**
 * Convert a transport adapter's UI message chunk stream back into the
 * Companion event model. Text deltas become `message.delta`; a `finish` chunk
 * carrying messageMetadata becomes the `ui.finish` bridge so draft / courseDraft
 * metadata survives the round trip.
 */
export async function* uiStreamToCompanionEvents(
  stream: ReadableStream<UIMessageChunk>,
): AsyncGenerator<CompanionTransportEvent> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === 'text-delta') {
        yield { type: 'message.delta', text: value.delta };
      } else if (value.type === 'finish') {
        const metadata = (value as { messageMetadata?: Record<string, unknown> }).messageMetadata;
        if (metadata) {
          yield { type: 'ui.finish', messageMetadata: metadata };
        }
      }
    }
    yield { type: 'message.complete' };
  } finally {
    reader.releaseLock();
  }
}
