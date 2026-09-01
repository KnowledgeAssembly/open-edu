import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import type { CompanionPermissions } from '@open-edu/companion';
import type { CompanionClient, CompanionTransportInput } from './CompanionClient.js';
import { companionEventsToUIMessageChunks } from './companionToUIMessage.js';
import type { StudioContextSnapshot } from './context.js';

export interface CompanionRequestBuildInput {
  messages: UIMessage[];
  chatId: string;
  signal?: AbortSignal;
}

export interface CompanionRequestSpec {
  message: string;
  context: StudioContextSnapshot;
  permissions: CompanionPermissions;
}

export interface CompanionChatTransportOptions {
  client: CompanionClient;
  buildRequest: (input: CompanionRequestBuildInput) => CompanionRequestSpec;
}

/**
 * AI SDK `ChatTransport` backed by a `CompanionClient`. It preserves the
 * `DefaultChatTransport`/hosted transports as adapters behind the client and is
 * the only place the provider touches the AI SDK stream shape: the client emits
 * CompanionEvents and `companionEventsToUIMessageChunks` maps them to UI chunks.
 */
export class CompanionChatTransport<UI extends UIMessage> implements ChatTransport<UI> {
  constructor(private readonly options: CompanionChatTransportOptions) {}

  async sendMessages(
    options: CompanionTransportInput & {
      trigger: 'submit-message' | 'regenerate-message';
      messageId: string | undefined;
      abortSignal: AbortSignal | undefined;
    },
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { message, context, permissions } = this.options.buildRequest({
      messages: options.messages,
      chatId: options.chatId,
      signal: options.abortSignal,
    });
    const events = this.options.client.run(
      {
        message,
        context,
        conversationId: options.chatId,
        permissions,
      },
      {
        messages: options.messages,
        chatId: options.chatId,
        signal: options.abortSignal,
      },
    );
    return companionEventsToUIMessageChunks(events);
  }

  async reconnectToStream() {
    return null;
  }
}
