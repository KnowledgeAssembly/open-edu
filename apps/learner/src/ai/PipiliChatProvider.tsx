import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import type { PipiliResponseMetadata } from '@open-edu/ai-companion';
import { useCompanion } from './CompanionProvider.js';
import { learningContextToSnapshot } from './context-mapper.js';

export interface PipiliChatState {
  messages: UIMessage[];
  sendMessage: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  isLoading: boolean;
  error: Error | undefined;
  stop: () => void;
  clearError: () => void;
  setMessages: (messages: UIMessage[]) => void;
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

  const contextRef = useRef(companion.context);
  contextRef.current = companion.context;

  const { messages, append, reload, status, error, stop, setMessages } = useChat({
    id: conversationId,
    api: '/api/pipili/chat',
    body: {
      conversationId,
    },
    onError: (err) => {
      console.error('Pipili chat error (category only):', err?.name);
    },
    onFinish: (message) => {
      if (status === 'ready') {
        const text = message.content ?? '';
        if (text) {
          const annotations = message.annotations;
          const metadata =
            Array.isArray(annotations) && annotations.length > 0
              ? (annotations[annotations.length - 1] as PipiliResponseMetadata | undefined)
              : undefined;
          companion.persistAssistantMessage({
            id: message.id,
            text,
            metadata,
          });
        }
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const sendMessage = useCallback(
    async (text: string) => {
      const contextSnapshot = learningContextToSnapshot(contextRef.current);
      await append(
        {
          role: 'user',
          content: text,
        },
        {
          body: {
            conversationId,
            context: contextSnapshot,
          },
        },
      );
    },
    [append, conversationId],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    companion.clearConversation();
  }, [setMessages, companion]);

  const requestHint = useCallback(
    async (level: 1 | 2 | 3 | 4) => {
      await sendMessage(`I'd like hint level ${level}, please.`);
    },
    [sendMessage],
  );

  const value: PipiliChatState = {
    messages,
    sendMessage,
    regenerate: () => reload().then(() => {}),
    status,
    isLoading,
    error,
    stop,
    clearError: () => {},
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
