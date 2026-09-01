import { DefaultChatTransport, type UIMessage } from 'ai';
import type { CompanionRequest } from '@open-edu/companion';
import type {
  CompanionClient,
  CompanionTransportEvent,
  CompanionTransportInput,
} from './CompanionClient.js';
import { uiStreamToCompanionEvents } from './uiStreamToCompanionEvents.js';

export interface HttpCompanionClientOptions {
  api: string;
  buildBody: (messages: UIMessage[], chatId: string) => object;
}

/**
 * The single Studio assistant client. Runs the request through the Vite
 * `/api/studio/ai/chat` handler via the AI SDK `DefaultChatTransport`, then
 * re-expresses the resulting UI stream as CompanionEvents. Routing and tool
 * dispatch live server-side in the agent loop; this client never re-parses
 * intents. Used in both local file-system and browser (OPFS) Studio modes.
 */
export class HttpCompanionClient implements CompanionClient {
  constructor(private readonly options: HttpCompanionClientOptions) {}

  async *run(
    _request: CompanionRequest,
    transport?: CompanionTransportInput,
  ): AsyncIterable<CompanionTransportEvent> {
    const messages = transport?.messages;
    if (!messages) {
      throw new Error('HttpCompanionClient requires the transport message list');
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
