import { DefaultChatTransport, type UIMessage } from 'ai';
import type { CompanionRequest } from '@open-edu/companion';
import type {
  CompanionClient,
  CompanionTransportEvent,
  CompanionTransportInput,
} from './CompanionClient.js';
import { uiStreamToCompanionEvents } from './uiStreamToCompanionEvents.js';

export interface LocalCompanionClientOptions {
  api: string;
  buildBody: (messages: UIMessage[], chatId: string) => object;
}

/**
 * Local-mode client: runs the request through the Vite `/api/studio/ai/chat`
 * handler via the AI SDK `DefaultChatTransport`, then re-expresses the resulting
 * UI stream as CompanionEvents. Server tool dispatch (draft / course gen) keeps
 * running exactly as before; only the client-side seam moves.
 */
export class LocalCompanionClient implements CompanionClient {
  constructor(private readonly options: LocalCompanionClientOptions) {}

  async *run(
    _request: CompanionRequest,
    transport?: CompanionTransportInput,
  ): AsyncIterable<CompanionTransportEvent> {
    const messages = transport?.messages;
    if (!messages) {
      throw new Error('LocalCompanionClient requires the transport message list');
    }
    const chatId = transport?.chatId ?? _request.conversationId;
    const inner = new DefaultChatTransport<UIMessage>({
      api: this.options.api,
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: this.options.buildBody(msgs, id),
      }),
    });
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
