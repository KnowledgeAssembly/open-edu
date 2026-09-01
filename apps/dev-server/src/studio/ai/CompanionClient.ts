import type { UIMessage } from 'ai';
import type { CompanionEvent, CompanionRequest, CompanionPermissions } from '@open-edu/companion';

/**
 * Private dev-server bridge event. Carries the finish metadata produced by the
 * underlying transport adapters (`DefaultChatTransport` / hosted) so the existing
 * draft cards / courseDraft quality chips keep working unchanged. It is not part
 * of the `@open-edu/companion` domain contract.
 */
export type CompanionTransportEvent =
  | CompanionEvent
  | { type: 'ui.finish'; messageMetadata?: Record<string, unknown> };

/** Transport-level details the client needs to drive the underlying adapter. */
export interface CompanionTransportInput {
  messages: UIMessage[];
  chatId: string;
  signal?: AbortSignal;
}

export interface CompanionClient {
  run(
    request: CompanionRequest,
    transport?: CompanionTransportInput,
  ): AsyncIterable<CompanionTransportEvent>;
}

export const DEFAULT_PERMISSIONS: CompanionPermissions = {
  allowed: [
    { id: 'course.generate', kind: 'propose' },
    { id: 'item.generate', kind: 'propose' },
    { id: 'item.edit', kind: 'propose' },
  ],
  requireApprovalFor: ['commit', 'destructive'],
};
