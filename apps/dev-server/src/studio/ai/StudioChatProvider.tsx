import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { useTranslation } from '@open-edu/i18n';
import { getConversationId, setConversationId } from './assistantStorage';
import { useStudioAssistant } from './StudioAssistantProvider';
import type { DraftApplyMode } from './StudioAssistantProvider';
import type { DraftItem, CourseDraftResult, ItemIntent, ItemIntentParams } from './types';
import type { StudioApi } from '../studioApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    mode?: 'explain' | 'draft' | 'course_draft';
    drafts?: DraftItem[];
    courseDraft?: CourseDraftResult;
    applyMode?: DraftApplyMode;
  };
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

export function StudioChatProvider({
  children,
  courseId,
  api,
  onOpenPath,
  onError,
  onOutlineChanged,
}: {
  children: ReactNode;
  courseId?: string;
  api?: StudioApi;
  onOpenPath?: (path: string) => void;
  onError?: (message: string) => void;
  onOutlineChanged?: () => void;
}) {
  const { t } = useTranslation();
  const { context, setPendingDrafts } = useStudioAssistant();
  const contextRef = useRef(context);
  contextRef.current = context;

  const courseKey = courseId || 'default';
  const [conversationId, setConversationIdState] = useState(() => {
    const existing = getConversationId(courseKey);
    if (existing) return existing;
    const id = createConversationId();
    setConversationId(courseKey, id);
    return id;
  });

  useEffect(() => {
    const existing = getConversationId(courseKey);
    if (existing) {
      setConversationIdState(existing);
      return;
    }
    const id = createConversationId();
    setConversationId(courseKey, id);
    setConversationIdState(id);
  }, [courseKey]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const appendAssistantNote = useCallback((content: string) => {
    const note: ChatMessage = {
      id: `assistant-note-${Date.now()}`,
      role: 'assistant',
      content,
    };
    const next = [...messagesRef.current, note];
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const snapshot = contextRef.current;
      if (!snapshot) {
        setStatus('error');
        return;
      }

      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content };
      const history = [...messagesRef.current, userMsg];
      messagesRef.current = history;
      setMessages(history);
      setStatus('loading');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/studio/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            context: snapshot,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error || 'Request failed');
        }

        const data = await response.json();
        const applyMode: DraftApplyMode =
          data.applyMode === 'buffer' || data.applyMode === 'file'
            ? data.applyMode
            : data.drafts && data.drafts.length > 1
              ? 'file'
              : snapshot.view === 'edit-activity'
                ? 'buffer'
                : 'file';

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || data.text || '',
          metadata: data.metadata
            ? {
                mode: data.metadata.mode,
                drafts: data.drafts,
                courseDraft: data.courseDraft || data.metadata.courseDraft,
                applyMode,
              }
            : data.courseDraft
              ? {
                  mode: 'course_draft',
                  courseDraft: data.courseDraft,
                }
              : undefined,
        };
        const next = [...messagesRef.current, assistantMsg];
        messagesRef.current = next;
        setMessages(next);

        if (assistantMsg.metadata?.drafts?.length) {
          setPendingDrafts({
            items: assistantMsg.metadata.drafts,
            source: 'chat',
            applyMode,
            context: {
              kind: snapshot.activity?.kind as 'lesson' | 'quiz' | 'practice' | undefined,
              path: snapshot.activity?.path,
            },
          });
        }

        setStatus('idle');
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setStatus('idle');
        } else {
          setStatus('error');
        }
      } finally {
        abortRef.current = null;
      }
    },
    [conversationId, setPendingDrafts],
  );

  const runIntent = useCallback(
    async (
      kind: 'lesson' | 'quiz' | 'practice',
      intent: ItemIntent,
      currentContent: string,
      params?: ItemIntentParams,
    ) => {
      const snapshot = contextRef.current;
      if (!snapshot || !api) {
        setStatus('error');
        return;
      }

      const locale = snapshot.locale || 'en';
      const resolvedParams: ItemIntentParams | undefined =
        intent === 'translate' ? { targetLocale: locale } : params;

      const intentLabel = `[${intent}]`;
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: intentLabel,
      };
      const history = [...messagesRef.current, userMsg];
      messagesRef.current = history;
      setMessages(history);
      setStatus('loading');

      try {
        const result = await api.generateItemEdit(kind, intent, currentContent, resolvedParams);

        if (result.ok) {
          const applyMode: DraftApplyMode = result.items.length > 1 ? 'file' : 'buffer';
          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: t('studio.assistant.draft.previewLabel'),
            metadata: {
              mode: 'draft',
              drafts: result.items,
              applyMode,
            },
          };
          const next = [...messagesRef.current, assistantMsg];
          messagesRef.current = next;
          setMessages(next);

          setPendingDrafts({
            items: result.items,
            source: 'intent',
            applyMode,
            context: { kind, path: snapshot.activity?.path },
          });
        } else {
          const errorMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: t('studio.assistant.intent.error'),
          };
          const next = [...messagesRef.current, errorMsg];
          messagesRef.current = next;
          setMessages(next);
        }

        setStatus('idle');
      } catch {
        setStatus('error');
      }
    },
    [api, setPendingDrafts, t],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(() => {
    const msgs = messagesRef.current;
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;

    let base = msgs;
    if (base[base.length - 1]?.role === 'assistant') {
      base = base.slice(0, -1);
    }
    if (base[base.length - 1]?.role === 'user') {
      base = base.slice(0, -1);
    }
    messagesRef.current = base;
    setMessages(base);
    void sendMessage(lastUser.content);
  }, [sendMessage]);

  const clearError = useCallback(() => setStatus('idle'), []);
  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
  }, []);

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
