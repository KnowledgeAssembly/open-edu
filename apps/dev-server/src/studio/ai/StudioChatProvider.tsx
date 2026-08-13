import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useTranslation } from '@open-edu/i18n';
import { getConversationId, setConversationId } from './assistantStorage';
import { useStudioAssistant } from './StudioAssistantProvider';
import { ConversationStore, type StoredChatMessage } from './ConversationStore';
import type { DraftApplyMode } from './StudioAssistantProvider';
import type { DraftItem, CourseDraftResult, ItemIntent, ItemIntentParams } from './types';
import type { StudioApi } from '../studioApi';
import type { StudioContextSnapshot } from './context';

interface ChatMessageMetadata {
  mode?: 'explain' | 'draft' | 'course_draft';
  drafts?: DraftItem[];
  courseDraft?: CourseDraftResult;
  applyMode?: DraftApplyMode;
  suggestedNextSteps?: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: ChatMessageMetadata;
}

interface StudioChatContextType {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  status: 'idle' | 'loading' | 'error';
  stop: () => void;
  regenerate: () => void;
  clearError: () => void;
  clearMessages: () => void;
  appendAssistantNote: (content: string) => void;
  ingestCourseDraft: (
    userContent: string,
    courseDraft: CourseDraftResult,
    readyMessage: string,
  ) => void;
  runIntent: (
    kind: 'lesson' | 'quiz' | 'practice',
    intent: ItemIntent,
    currentContent: string,
    params?: ItemIntentParams,
  ) => Promise<void>;
  api: StudioApi | null;
  onOpenPath?: (path: string) => void;
  onError?: (message: string) => void;
  onOutlineChanged?: () => void;
}

const StudioChatContext = createContext<StudioChatContextType | null>(null);

function createConversationId(): string {
  return `studio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Convert our persisted shape into an AI SDK v7 UIMessage. */
function toUIMessage(stored: StoredChatMessage): UIMessage {
  return {
    id: stored.id,
    role: stored.role,
    parts: stored.content ? [{ type: 'text', text: stored.content, state: 'done' }] : [],
    ...(stored.metadata ? { metadata: stored.metadata } : {}),
  };
}

interface StudioChatProviderProps {
  children: ReactNode;
  courseId?: string;
  api?: StudioApi;
  onOpenPath?: (path: string) => void;
  onError?: (message: string) => void;
  onOutlineChanged?: () => void;
}

/**
 * Provides the author-assistant chat surface. Resolves the per-course thread
 * (conversationId + persisted messages) before mounting the AI SDK chat
 * runtime, so `useChat` is constructed with the correct thread and remounts
 * when the course or a "New conversation" changes.
 */
export function StudioChatProvider(props: StudioChatProviderProps) {
  const courseKey = props.courseId || 'default';
  const storeRef = useRef(new ConversationStore());

  // Resolve the per-course thread id synchronously so the chat runtime can be
  // mounted with a stable tree from the first render. Hydrated message history
  // is applied asynchronously once IndexedDB / sessionStorage resolves.
  const [conversationId, setConversationIdState] = useState<string>(() => {
    const existing = getConversationId(courseKey);
    const id = existing ?? createConversationId();
    if (!existing) {
      setConversationId(courseKey, id);
    }
    return id;
  });
  const [hydrated, setHydrated] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHydrated(null);
    void storeRef.current.loadMessages(courseKey).then((stored) => {
      if (cancelled) return;
      setHydrated(stored.map(toUIMessage));
    });
    return () => {
      cancelled = true;
    };
  }, [courseKey, conversationId]);

  return (
    <ChatRuntime
      key={`${courseKey}:${conversationId}`}
      courseKey={courseKey}
      conversationId={conversationId}
      initialMessages={hydrated ?? []}
      hydrationPending={hydrated === null}
      setConversationIdState={setConversationIdState}
      api={props.api}
      onOpenPath={props.onOpenPath}
      onError={props.onError}
      onOutlineChanged={props.onOutlineChanged}
    >
      {props.children}
    </ChatRuntime>
  );
}

function ChatRuntime({
  children,
  courseKey,
  conversationId,
  initialMessages,
  hydrationPending,
  setConversationIdState,
  api,
  onOpenPath,
  onError,
  onOutlineChanged,
}: {
  children: ReactNode;
  courseKey: string;
  conversationId: string;
  initialMessages: UIMessage[];
  hydrationPending: boolean;
  setConversationIdState: (id: string) => void;
  api?: StudioApi;
  onOpenPath?: (path: string) => void;
  onError?: (message: string) => void;
  onOutlineChanged?: () => void;
}) {
  const { t } = useTranslation();
  const {
    context,
    setPendingDrafts,
    lastCourseQuality,
    setLastCourseQuality,
    setEphemeralSuggestions,
  } = useStudioAssistant();

  const contextRef = useRef<StudioContextSnapshot | null>(context);
  contextRef.current = context;
  const lastCourseQualityRef = useRef(lastCourseQuality);
  lastCourseQualityRef.current = lastCourseQuality;

  const transport = useRef(
    new DefaultChatTransport({
      api: '/api/studio/ai/chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          conversationId: id,
          messages: messages.map((m) => ({ role: m.role, content: extractText(m) })),
          context: {
            ...(contextRef.current ?? {}),
            ...(lastCourseQualityRef.current?.length
              ? { lastCourseDraftQuality: lastCourseQualityRef.current }
              : {}),
          },
        },
      }),
    }),
  ).current;

  const {
    messages: rawMessages,
    sendMessage: chatSend,
    regenerate: chatRegenerate,
    status: chatStatus,
    stop: chatStop,
    clearError: chatClearError,
    setMessages: chatSetMessages,
  } = useChat({
    id: conversationId,
    transport,
    messages: initialMessages,
    onError: (err) => {
      console.error('[studio-chat] error:', err?.name);
    },
    onFinish: ({ message, isAbort, isError }) => {
      if (isAbort || isError) return;
      const metadata = message.metadata as ChatMessageMetadata | undefined;

      if (metadata?.drafts?.length) {
        const applyMode: DraftApplyMode = metadata.applyMode ?? 'file';
        setPendingDrafts({
          items: metadata.drafts,
          source: 'chat',
          applyMode,
          context: {
            kind: contextRef.current?.activity?.kind as 'lesson' | 'quiz' | 'practice' | undefined,
            path: contextRef.current?.activity?.path,
          },
        });
      }

      if (metadata?.courseDraft?.success) {
        setLastCourseQuality(metadata.courseDraft.quality);
      }
    },
  });

  const rawMessagesRef = useRef(rawMessages);
  rawMessagesRef.current = rawMessages;

  // Apply persisted history once hydration resolves. Guarded so a "new
  // conversation" (key remount) never resurrects the previous thread.
  const appliedHydrationRef = useRef(initialMessages.length > 0);
  useEffect(() => {
    if (hydrationPending) return;
    if (appliedHydrationRef.current) return;
    if (initialMessages.length > 0) {
      appliedHydrationRef.current = true;
      chatSetMessages(initialMessages);
    } else {
      appliedHydrationRef.current = true;
    }
  }, [hydrationPending, initialMessages, chatSetMessages]);

  const messages: ChatMessage[] = rawMessages.map(fromUIMessage);

  const storeRef = useRef(new ConversationStore());

  // Persist the thread (fire-and-forget) once a turn settles.
  useEffect(() => {
    if (rawMessages.length === 0) return;
    if (chatStatus === 'submitted' || chatStatus === 'streaming') return;
    void storeRef.current.saveMessages(courseKey, rawMessages.map(toStoredMessage));
  }, [rawMessages.length, chatStatus, courseKey]);

  const status: 'idle' | 'loading' | 'error' =
    chatStatus === 'error'
      ? 'error'
      : chatStatus === 'submitted' || chatStatus === 'streaming'
        ? 'loading'
        : 'idle';

  const sendMessage = useCallback(
    (content: string) => {
      setEphemeralSuggestions(null);
      void chatSend({ text: content });
    },
    [chatSend, setEphemeralSuggestions],
  );

  const stop = useCallback(() => chatStop(), [chatStop]);

  const regenerate = useCallback(() => void chatRegenerate(), [chatRegenerate]);

  const clearError = useCallback(() => chatClearError(), [chatClearError]);

  const clearMessages = useCallback(() => {
    chatSetMessages([]);
    void storeRef.current.clearMessages(courseKey);
    const newId = createConversationId();
    setConversationId(courseKey, newId);
    setConversationIdState(newId);
  }, [chatSetMessages, courseKey, setConversationIdState]);

  const appendAssistantNote = useCallback(
    (content: string) => {
      const note: StoredChatMessage = {
        id: `assistant-note-${Date.now()}`,
        role: 'assistant',
        content,
        createdAt: Date.now(),
      };
      const current = rawMessagesRef.current;
      chatSetMessages([...current, toUIMessage(note)]);
    },
    [chatSetMessages],
  );

  const ingestCourseDraft = useCallback(
    (userContent: string, courseDraft: CourseDraftResult, readyMessage: string) => {
      const userMsg: StoredChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userContent,
        createdAt: Date.now(),
      };
      const assistantMsg: StoredChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: courseDraft.success
          ? readyMessage
          : t('studio.assistant.chat.courseDraftFailed', {
              error: courseDraft.error || t('studio.assistant.courseDraft.unknownError'),
            }),
        metadata: courseDraft.success ? { mode: 'course_draft', courseDraft } : undefined,
        createdAt: Date.now(),
      };
      const current = rawMessagesRef.current;
      chatSetMessages([...current, toUIMessage(userMsg), toUIMessage(assistantMsg)]);
      if (courseDraft.success) {
        setLastCourseQuality(courseDraft.quality);
      }
    },
    [chatSetMessages, setLastCourseQuality, t],
  );

  const runIntent = useCallback(
    async (
      kind: 'lesson' | 'quiz' | 'practice',
      intent: ItemIntent,
      currentContent: string,
      params?: ItemIntentParams,
    ) => {
      if (!api) return;
      try {
        const result = await api.generateItemEdit(kind, intent, currentContent, params);
        if (result.ok) {
          const applyMode: DraftApplyMode = result.items.length > 1 ? 'file' : 'buffer';
          const assistantMsg: StoredChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: t('studio.assistant.draft.previewLabel'),
            metadata: { mode: 'draft', drafts: result.items, applyMode },
            createdAt: Date.now(),
          };
          const current = rawMessagesRef.current;
          chatSetMessages([...current, toUIMessage(assistantMsg)]);
          setPendingDrafts({
            items: result.items,
            source: 'intent',
            applyMode,
            context: { kind, path: contextRef.current?.activity?.path },
          });
        }
      } catch {
        onError?.(t('studio.assistant.intent.error'));
      }
    },
    [api, chatSetMessages, onError, setPendingDrafts, t],
  );

  return (
    <StudioChatContext.Provider
      value={{
        messages,
        sendMessage,
        status,
        stop,
        regenerate,
        clearError,
        clearMessages,
        appendAssistantNote,
        ingestCourseDraft,
        runIntent,
        api: api ?? null,
        onOpenPath,
        onError,
        onOutlineChanged,
      }}
    >
      {children}
    </StudioChatContext.Provider>
  );
}

export function useStudioChat() {
  const ctx = useContext(StudioChatContext);
  if (!ctx) throw new Error('useStudioChat must be used within a StudioChatProvider');
  return ctx;
}

/** Extract plain text from a UIMessage (v7 parts style) with content fallback. */
function extractText(msg: {
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}): string {
  if (msg.parts?.length) {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return msg.content ?? '';
}

function toStoredMessage(msg: UIMessage): StoredChatMessage {
  return {
    id: msg.id,
    role: (msg.role as 'user' | 'assistant') || 'user',
    content: extractText(msg),
    metadata: (msg.metadata as StoredChatMessage['metadata']) || undefined,
    createdAt: Date.now(),
  };
}

function fromUIMessage(msg: UIMessage): ChatMessage {
  return {
    id: msg.id,
    role: (msg.role as 'user' | 'assistant') || 'user',
    content: extractText(msg),
    metadata: (msg.metadata as ChatMessageMetadata) || undefined,
  };
}
