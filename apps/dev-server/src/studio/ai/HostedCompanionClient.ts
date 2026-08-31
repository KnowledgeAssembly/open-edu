import type { ChatTransport, UIMessage } from 'ai';
import type { CompanionRequest } from '@open-edu/companion';
import type {
  CompanionClient,
  CompanionTransportEvent,
  CompanionTransportInput,
} from './CompanionClient.js';
import { uiStreamToCompanionEvents } from './uiStreamToCompanionEvents.js';

export interface HostedCompanionClientOptions {
  createTransport: () => ChatTransport<UIMessage>;
}

/**
 * Hosted-mode client: runs the request through the browser AI paths (course
 * draft, item draft, item edit) via `createHostedChatTransport`, then re-expresses
 * the resulting UI stream as CompanionEvents. `createHostedChatTransport` remains
 * the adapter; this client only changes where the event mapping happens.
 */
export class HostedCompanionClient implements CompanionClient {
  constructor(private readonly options: HostedCompanionClientOptions) {}

  async *run(
    _request: CompanionRequest,
    transport?: CompanionTransportInput,
  ): AsyncIterable<CompanionTransportEvent> {
    const messages = transport?.messages;
    if (!messages) {
      throw new Error('HostedCompanionClient requires the transport message list');
    }
    const chatId = transport?.chatId ?? _request.conversationId;
    const inner = this.options.createTransport();
    const stream = await inner.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages,
      chatId,
      abortSignal: transport?.signal,
    });
    yield* uiStreamToCompanionEvents(stream);
  }
}
