import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { getConversationId, setConversationId } from './assistantStorage';
import { useStudioAssistant } from './index';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface StudioChatContextType {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  status: 'idle' | 'loading' | 'error';
  stop: () => void;
  regenerate: () => void;
  clearError: () => void;
  clearMessages: () => void;
}

const StudioChatContext = createContext<StudioChatContextType | null>(null);

export function StudioChatProvider({ 
  children, 
  courseId 
}: { 
  children: ReactNode; 
  courseId?: string; 
}) {
  const { context } = useStudioAssistant();
  const contextRef = useRef(context);
  contextRef.current = context;

  const conversationId = getConversationId(courseId || 'default') ?? `studio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setStatus('loading');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/studio/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: contextRef.current,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || data.text || '',
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStatus('idle');
      
      if (!getConversationId(courseId || 'default')) {
        setConversationId(courseId || 'default', conversationId);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatus('error');
      }
    } finally {
      abortRef.current = null;
    }
  }, [conversationId, courseId, messages]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(() => {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg) {
      setMessages(prev => prev.slice(0, -1));
      sendMessage(lastUserMsg.content);
    }
  }, [messages, sendMessage]);

  const clearError = useCallback(() => setStatus('idle'), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  return (
    <StudioChatContext.Provider 
      value={{ messages, sendMessage, status, stop, regenerate, clearError, clearMessages }}
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