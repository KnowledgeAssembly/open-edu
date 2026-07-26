import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { PipiliResponseMetadata } from '@open-edu/ai-companion';
import { useCompanion } from './CompanionProvider.js';
import { learningContextToSnapshot } from './context-mapper.js';

export interface PipiliChatState {
  messages: UIMessage<PipiliResponseMetadata>[];
  sendMessage: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  isLoading: boolean;
  error: Error | undefined;
  stop: () => void;
  clearError: () => void;
  setMessages: (messages: UIMessage<PipiliResponseMetadata>[]) => void;
  clearMessages: () => void;
  conversationId: string;
  requestHint: (level: 1 | 2 | 3 | 4) => Promise<void>;
}

const PipiliChatContext = createContext<PipiliChatState | null>(null);

interface PipiliChatProviderProps {
  children: ReactNode;
  conversationId?: string;
}

export function PipiliChatProvider({
  children,
  conversationId: initialConversationId,
}: PipiliChatProviderProps): JSX.Element {
  const companion = useCompanion();
  const conversationId = useMemo(
    () => initialConversationId ?? `pipili-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    [initialConversationId],
  );

  // Keep the latest LearningContext in a ref so the transport (created once
  // below) can read a fresh snapshot on every send/regenerate without being
  // re-created.
  const contextRef = useRef(companion.context);
  contextRef.current = companion.context;

  // v7 transport: inject conversationId + a fresh context snapshot into the
  // POST body on every send (and regenerate).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/pipili/chat',
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: {
            conversationId: id,
            messages,
            context: learningContextToSnapshot(contextRef.current),
          },
        }),
      }),
    [],
  );

  const {
    messages,
    sendMessage: chatSend,
    regenerate: chatRegenerate,
    status,
    error,
    stop,
    clearError,
    setMessages,
  } = useChat<UIMessage<PipiliResponseMetadata>>({
    id: conversationId,
    transport,
    onError: (err) => {
      // Telemetry only — never log provider internals.
      console.error('Pipili chat error (category only):', err?.name);
    },
    onFinish: ({ message, isAbort, isError }) => {
      // Spec orchestration step 10: persist the completed assistant message
      // through the existing IndexedDB-backed ConversationManager. Only
      // persist when the stream finished cleanly (an aborted or errored
      // stream must not be persisted as complete).
      if (isAbort || isError) return;
      const text = (message.parts ?? [])
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('');
      if (!text) return;
      companion.persistAssistantMessage({
        id: message.id,
        text,
        metadata: message.metadata as PipiliResponseMetadata | undefined,
      });
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const sendMessage = useCallback(
    async (text: string) => {
      // Single send path. v7 useChat.sendMessage takes a message object.
      // The transport's prepareSendMessagesRequest injects
      // conversationId + context, so the request is course-aware.
      await chatSend({ text });
    },
    [chatSend],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    companion.clearConversation();
  }, [setMessages, companion]);

  const requestHint = useCallback(
    async (level: 1 | 2 | 3 | 4) => {
      // Hint requests are normal user turns; the server routes the
      // createProgressiveHint tool when it detects a hint request.
      await sendMessage(`I'd like hint level ${level}, please.`);
    },
    [sendMessage],
  );

  const value: PipiliChatState = {
    messages,
    sendMessage,
    regenerate: () => chatRegenerate(),
    status,
    isLoading,
    error,
    stop,
    clearError,
    setMessages,
    clearMessages,
    conversationId,
    requestHint,
  };

  return <PipiliChatContext.Provider value={value}>{children}</PipiliChatContext.Provider>;
}

export function usePipiliChat(): PipiliChatState {
  const ctx = useContext(PipiliChatContext);
  if (!ctx) {
    throw new Error('usePipiliChat must be used within PipiliChatProvider');
  }
  return ctx;
}
