import type { UIMessageChunk } from 'ai';
import type { CourseDraftResult, DraftItem } from '@open-edu/companion';
import type { CompanionTransportEvent } from './CompanionClient.js';

export interface CompanionEventUIOptions {
  /** Build the finish `messageMetadata` from a captured `draft.created` payload. */
  messageMetadata?: (info: {
    draft?: CourseDraftResult | DraftItem[];
  }) => Record<string, unknown> | undefined;
  /** Map a runtime error to user-facing text. */
  errorFallback?: (message: string) => string;
  /** Fired when the stream reports `message.complete`. */
  onComplete?: () => void;
}

/**
 * The single place where the domain event model (spec §7) is mapped to AI SDK UI
 * message chunks. `message.delta` → text-delta; a captured `draft.created` is
 * handed to the `messageMetadata` builder for the finish chunk; the private
 * `ui.finish` bridge restores underlying-transport metadata (provider path).
 * `error` events become a text-delta via `errorFallback`. All remaining events
 * are no-ops for the current UI (retained for later phases).
 */
export function companionEventsToUIMessageChunks(
  events: AsyncIterable<CompanionTransportEvent>,
  options: CompanionEventUIOptions = {},
): ReadableStream<UIMessageChunk> {
  const textId = `companion-${Date.now()}-text`;
  const messageId = `companion-${Date.now()}`;
  let finishMetadata: Record<string, unknown> | undefined;
  let capturedDraft: CourseDraftResult | DraftItem[] | undefined;
  let capturedTaskId: string | undefined;
  let capturedApproval: unknown;
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      controller.enqueue({ type: 'start', messageId });
      controller.enqueue({ type: 'text-start', id: textId });
      try {
        for await (const event of events) {
          if (event.type === 'message.delta') {
            controller.enqueue({ type: 'text-delta', id: textId, delta: event.text });
          } else if (event.type === 'draft.created') {
            capturedDraft = event.draft;
          } else if (event.type === 'ui.finish') {
            finishMetadata = event.messageMetadata;
          } else if (event.type === 'message.complete') {
            options.onComplete?.();
          } else if (event.type === 'error') {
            const text = options.errorFallback?.(event.error.message) ?? event.error.message;
            controller.enqueue({ type: 'text-delta', id: textId, delta: text });
          } else if (event.type === 'task.started' || event.type === 'task.completed') {
            capturedTaskId = event.taskId;
          } else if (event.type === 'approval.required') {
            capturedApproval = event.approval;
          }
        }
      } catch {
        // downstream onError handles surfacing
      }
      controller.enqueue({ type: 'text-end', id: textId });
      const metadata = finishMetadata ?? options.messageMetadata?.({ draft: capturedDraft });
      const enriched =
        metadata !== undefined || capturedTaskId !== undefined || capturedApproval !== undefined
          ? {
              ...(metadata ?? {}),
              ...(capturedTaskId !== undefined ? { taskId: capturedTaskId } : {}),
              ...(capturedApproval !== undefined ? { approval: capturedApproval } : {}),
            }
          : undefined;
      controller.enqueue({
        type: 'finish',
        finishReason: 'stop',
        ...(enriched ? { messageMetadata: enriched } : {}),
      } as UIMessageChunk);
      controller.close();
    },
  });
}
