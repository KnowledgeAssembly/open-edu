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
import { DefaultChatTransport, type ChatTransport, type UIMessage, type UIMessageChunk } from 'ai';
import { useTranslation } from '@open-edu/i18n';
import { getConversationId, setConversationId } from './assistantStorage';
import { useStudioAssistant } from './StudioAssistantProvider';
import { ConversationStore, type StoredChatMessage } from './ConversationStore';
import type { DraftApplyMode } from './StudioAssistantProvider';
import type {
  DraftItem,
  CourseDraftResult,
  ItemIntent,
  ItemIntentParams,
  AiItemAddResult,
  AiItemEditResult,
} from './types';
import type { StudioApi } from '../studioApi';
import type { ActivityKind, StudioContextSnapshot } from './context';
import { parseIntentFromMessage } from './chat/intent';
import { extractSuggestedNextSteps } from './chat/policy';

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

interface HostedChatResponse {
  terminal: 'finished' | 'error';
  content?: string;
  error?: string;
  suggestion?: string;
}

export type ChatItemKind = 'lesson' | 'quiz' | 'practice';

export type SuggestedNextStepMode = 'explain' | 'draft' | 'course_draft';

/** Localized fallbacks used when a callback is missing in transport mode. */
export interface HostedChatMessages {
  needOpenCourse?: string;
  needOpenActivity?: string;
  draftFailed?: string;
  editFailed?: string;
}

export interface HostedChatTransportOptions {
  api: string;
  buildBody: (messages: UIMessage[], chatId: string) => object;
  generateDraft?: (notes: string) => Promise<CourseDraftResult>;
  courseDraftReadyMessage?: string;
  generateItemAdd?: (kind: ChatItemKind, description: string) => Promise<AiItemAddResult>;
  draftReadyMessage?: string | ((kind: ChatItemKind) => string);
  generateItemEdit?: (
    kind: ChatItemKind,
    intent: ItemIntent,
    currentContent: string,
    params?: ItemIntentParams,
  ) => Promise<AiItemEditResult>;
  editReadyMessage?: string;
  getCurrentActivity?: () => StudioContextSnapshot['activity'] | undefined;
  getSuggestedNextSteps?: (mode: SuggestedNextStepMode, hasCourseDraft?: boolean) => string[];
  messages?: HostedChatMessages;
}

const FALLBACK_NEED_OPEN_COURSE = 'Open a course first, then I can generate a draft for it.';
const FALLBACK_NEED_OPEN_ACTIVITY =
  'Open an activity first, then I can rewrite or improve it for you.';
const FALLBACK_DRAFT_FAILED = "I couldn't create that draft. Try rephrasing your request.";
const FALLBACK_EDIT_FAILED = "I couldn't edit that activity. Try a different request.";

function isNoActiveCourseError(err: unknown): boolean {
  return (err as { code?: string })?.code === 'no-active-course';
}

/** Any activity kind that is not a first-class draftable item targets a lesson. */
export function normalizeActivityKind(kind: ActivityKind | undefined): ChatItemKind {
  if (kind === 'quiz' || kind === 'practice' || kind === 'lesson') return kind;
  return 'lesson';
}

/** Adapt the stateless JSON gateway contract to AI SDK UI message chunks.
 *  When a supported tool intent is detected in browser mode, the transport
 *  short-circuits to the dedicated browser AI paths (course draft, item draft,
 *  item edit) so content is actually generated instead of receiving a plain
 *  text explanation. Anything else falls through to the generic chat endpoint. */
export function createHostedChatTransport(
  options: HostedChatTransportOptions,
): ChatTransport<UIMessage> {
  const {
    api,
    buildBody,
    generateDraft,
    courseDraftReadyMessage,
    generateItemAdd,
    draftReadyMessage,
    generateItemEdit,
    editReadyMessage,
    getCurrentActivity,
    getSuggestedNextSteps,
    messages: messagesOptions = {},
  } = options;

  const suggestedNextSteps = (mode: SuggestedNextStepMode, hasCourseDraft = false): string[] =>
    getSuggestedNextSteps?.(mode, hasCourseDraft) ?? [];

  function buildToolResponse(
    content: string,
    metadata?: ChatMessageMetadata,
  ): ReadableStream<UIMessageChunk> {
    const messageId = `hosted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const textId = `${messageId}-text`;
    const chunks: UIMessageChunk[] = [
      { type: 'start', messageId },
      { type: 'start-step' },
      { type: 'text-start', id: textId },
      ...(content ? [{ type: 'text-delta' as const, id: textId, delta: content }] : []),
      { type: 'text-end', id: textId },
      { type: 'finish-step' },
      {
        type: 'finish',
        finishReason: 'stop',
        ...(metadata ? { messageMetadata: metadata } : {}),
      },
    ];
    return new ReadableStream<UIMessageChunk>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
  }

  return {
    async sendMessages({ messages, chatId, abortSignal }) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const lastUserContent = lastUser ? extractText(lastUser) : '';
      const hasToolCallbacks = Boolean(generateDraft || generateItemAdd || generateItemEdit);
      const intent = hasToolCallbacks ? parseIntentFromMessage(lastUserContent) : null;

      if (intent?.type === 'generate_course' && generateDraft) {
        try {
          const result = await generateDraft(lastUserContent);
          return buildToolResponse(courseDraftReadyMessage ?? '', {
            mode: 'course_draft',
            courseDraft: result,
            suggestedNextSteps: suggestedNextSteps('course_draft', true),
          });
        } catch (err) {
          if (isNoActiveCourseError(err)) {
            return buildToolResponse(messagesOptions.needOpenCourse ?? FALLBACK_NEED_OPEN_COURSE, {
              mode: 'explain',
              suggestedNextSteps: suggestedNextSteps('explain'),
            });
          }
          return buildToolResponse(messagesOptions.draftFailed ?? FALLBACK_DRAFT_FAILED, {
            mode: 'explain',
            suggestedNextSteps: suggestedNextSteps('explain'),
          });
        }
      }

      if (intent?.type === 'draft_new' && intent.kind && generateItemAdd) {
        try {
          const result = await generateItemAdd(
            intent.kind,
            intent.description ?? `Create a ${intent.kind}`,
          );
          if (!result.ok) {
            return buildToolResponse(messagesOptions.draftFailed ?? FALLBACK_DRAFT_FAILED, {
              mode: 'explain',
              suggestedNextSteps: suggestedNextSteps('explain'),
            });
          }
          const ready =
            typeof draftReadyMessage === 'function'
              ? draftReadyMessage(intent.kind)
              : (draftReadyMessage ?? '');
          return buildToolResponse(ready, {
            mode: 'draft',
            drafts: [result.item],
            suggestedNextSteps: suggestedNextSteps('draft'),
          });
        } catch (err) {
          if (isNoActiveCourseError(err)) {
            return buildToolResponse(messagesOptions.needOpenCourse ?? FALLBACK_NEED_OPEN_COURSE, {
              mode: 'explain',
              suggestedNextSteps: suggestedNextSteps('explain'),
            });
          }
          return buildToolResponse(messagesOptions.draftFailed ?? FALLBACK_DRAFT_FAILED, {
            mode: 'explain',
            suggestedNextSteps: suggestedNextSteps('explain'),
          });
        }
      }

      if (intent?.type === 'edit_existing' && generateItemEdit) {
        const activity = getCurrentActivity?.();
        if (!activity) {
          return buildToolResponse(
            messagesOptions.needOpenActivity ?? FALLBACK_NEED_OPEN_ACTIVITY,
            { mode: 'explain', suggestedNextSteps: suggestedNextSteps('explain') },
          );
        }
        const kind = normalizeActivityKind(activity.kind);
        try {
          const result = await generateItemEdit(
            kind,
            intent.intent || 'rewrite',
            activity.contentExcerpt ?? '',
            intent.params,
          );
          if (!result.ok) {
            return buildToolResponse(messagesOptions.editFailed ?? FALLBACK_EDIT_FAILED, {
              mode: 'explain',
              suggestedNextSteps: suggestedNextSteps('explain'),
            });
          }
          return buildToolResponse(editReadyMessage ?? '', {
            mode: 'draft',
            drafts: result.items,
            suggestedNextSteps: suggestedNextSteps('draft'),
          });
        } catch (err) {
          if (isNoActiveCourseError(err)) {
            return buildToolResponse(messagesOptions.needOpenCourse ?? FALLBACK_NEED_OPEN_COURSE, {
              mode: 'explain',
              suggestedNextSteps: suggestedNextSteps('explain'),
            });
          }
          return buildToolResponse(messagesOptions.editFailed ?? FALLBACK_EDIT_FAILED, {
            mode: 'explain',
            suggestedNextSteps: suggestedNextSteps('explain'),
          });
        }
      }

      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(buildBody(messages, chatId)),
        signal: abortSignal,
      });
      const data = (await response.json().catch(() => null)) as HostedChatResponse | null;
      if (!response.ok) {
        throw new Error(data?.error ?? 'The AI gateway request failed.');
      }
      if (!data || data.terminal !== 'finished') {
        const msg = data?.error ?? 'The AI gateway could not complete the request.';
        throw new Error(data?.suggestion ? `${msg}\n\n${data.suggestion}` : msg);
      }

      return buildToolResponse(data.content ?? '');
    },
    async reconnectToStream() {
      return null;
    },
  };
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
  chatApiUrl?: string;
  onOpenPath?: (path: string) => void;
  onError?: (message: string) => void;
  onOutlineChanged?: () => void;
}

/**
 * Provides the author-assistant chat surface. Resolves the per-course thread
 * (conversationId + persisted messages) before applying history into the AI SDK
 * chat runtime. Remounts when the course or a "New conversation" changes.
 */
export function StudioChatProvider(props: StudioChatProviderProps) {
  const courseKey = props.courseId || 'default';
  const storeRef = useRef(new ConversationStore());

  const [conversationId, setConversationIdState] = useState<string>(() => {
    const existing = getConversationId(courseKey);
    const id = existing ?? createConversationId();
    if (!existing) {
      setConversationId(courseKey, id);
    }
    return id;
  });
  const [hydrated, setHydrated] = useState<UIMessage[] | null>(null);

  // When the conversation id changes (New conversation), invalidate the
  // hydrated history synchronously so the remounted chat never hydrates with
  // the previous conversation's messages before the reload effect runs.
  const handleNewConversationId = useCallback((newId: string) => {
    setHydrated(null);
    setConversationIdState(newId);
  }, []);

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
      store={storeRef.current}
      setConversationIdState={handleNewConversationId}
      api={props.api}
      chatApiUrl={props.chatApiUrl}
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
  store,
  setConversationIdState,
  api,
  chatApiUrl,
  onOpenPath,
  onError,
  onOutlineChanged,
}: {
  children: ReactNode;
  courseKey: string;
  conversationId: string;
  initialMessages: UIMessage[];
  hydrationPending: boolean;
  store: ConversationStore;
  setConversationIdState: (id: string) => void;
  api?: StudioApi;
  chatApiUrl?: string;
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
  const clearingRef = useRef(false);
  const hydrationPendingRef = useRef(hydrationPending);
  hydrationPendingRef.current = hydrationPending;

  const transport = useRef<ChatTransport<UIMessage>>(
    chatApiUrl
      ? createHostedChatTransport({
          api: chatApiUrl,
          buildBody: (messages, id) => ({
            conversationId: id,
            messages: messages.map((m) => ({ role: m.role, content: extractText(m) })),
            context: {
              ...(contextRef.current ?? {}),
              ...(lastCourseQualityRef.current?.length
                ? { lastCourseDraftQuality: lastCourseQualityRef.current }
                : {}),
            },
          }),
          generateDraft: api ? (notes) => api.generateCourseDraft(notes) : undefined,
          courseDraftReadyMessage: t('studio.assistant.chat.courseDraftReady'),
          generateItemAdd: api
            ? (kind, description) => api.generateItemAdd(kind, description)
            : undefined,
          draftReadyMessage: (kind) => t('studio.assistant.chat.draftReady', { kind }),
          generateItemEdit: api
            ? (kind, intent, currentContent, params) =>
                api.generateItemEdit(kind, intent, currentContent, params)
            : undefined,
          editReadyMessage: t('studio.assistant.chat.editReady'),
          getCurrentActivity: () => contextRef.current?.activity ?? undefined,
          getSuggestedNextSteps: (mode, hasCourseDraft) =>
            extractSuggestedNextSteps({
              mode,
              view: contextRef.current?.view ?? 'outline',
              hasCourseDraft: Boolean(hasCourseDraft),
              locale: contextRef.current?.locale || 'en',
            }),
          messages: {
            needOpenCourse: t('studio.assistant.chat.needOpenCourse'),
            needOpenActivity: t('studio.assistant.chat.needOpenActivity'),
            draftFailed: t('studio.assistant.chat.draftError'),
            editFailed: t('studio.assistant.chat.editError'),
          },
        })
      : new DefaultChatTransport({
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
    messages: [],
    onError: (err: Error) => {
      console.error('[studio-chat] error:', err?.name);
    },
    onFinish: ({
      message,
      isAbort,
      isError,
    }: {
      message: UIMessage;
      isAbort: boolean;
      isError: boolean;
    }) => {
      if (isAbort || isError || clearingRef.current) return;
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

  // Apply persisted history once. Never clobber messages the user already sent
  // while hydration was still pending.
  const appliedHydrationRef = useRef(false);
  useEffect(() => {
    if (hydrationPending) return;
    if (appliedHydrationRef.current) return;
    appliedHydrationRef.current = true;
    if (initialMessages.length > 0 && rawMessagesRef.current.length === 0) {
      chatSetMessages(initialMessages);
    }
  }, [hydrationPending, initialMessages, chatSetMessages]);

  // Persist the thread once a turn settles. ConversationStore write generations
  // drop/supersede saves that race with New conversation clears.
  useEffect(() => {
    if (clearingRef.current) return;
    if (hydrationPending) return;
    if (rawMessages.length === 0) return;
    if (chatStatus === 'submitted' || chatStatus === 'streaming') return;
    void store.saveMessages(courseKey, rawMessages.map(toStoredMessage));
  }, [rawMessages.length, chatStatus, courseKey, store, hydrationPending]);

  const status: 'idle' | 'loading' | 'error' =
    chatStatus === 'error'
      ? 'error'
      : chatStatus === 'submitted' || chatStatus === 'streaming' || hydrationPending
        ? 'loading'
        : 'idle';

  const clearMessages = useCallback(() => {
    if (clearingRef.current) return;
    clearingRef.current = true;
    chatStop();
    chatSetMessages([]);
    void (async () => {
      await store.clearMessages(courseKey);
      const newId = createConversationId();
      setConversationId(courseKey, newId);
      setConversationIdState(newId);
    })();
  }, [chatSetMessages, chatStop, courseKey, setConversationIdState, store]);

  const sendMessage = useCallback(
    (content: string) => {
      if (clearingRef.current || hydrationPendingRef.current) return;
      if (!contextRef.current) {
        onError?.(t('studio.assistant.error.request'));
        return;
      }
      setEphemeralSuggestions(null);
      void chatSend({ text: content });
    },
    [chatSend, onError, setEphemeralSuggestions, t],
  );

  const stop = useCallback(() => chatStop(), [chatStop]);

  const regenerate = useCallback(() => {
    if (clearingRef.current || hydrationPendingRef.current) return;
    void chatRegenerate();
  }, [chatRegenerate]);

  const clearError = useCallback(() => chatClearError(), [chatClearError]);

  const appendAssistantNote = useCallback(
    (content: string) => {
      if (clearingRef.current) return;
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
      if (clearingRef.current) return;
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
      if (!api || clearingRef.current) return;
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

  const messages: ChatMessage[] = rawMessages.map(fromUIMessage);

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
