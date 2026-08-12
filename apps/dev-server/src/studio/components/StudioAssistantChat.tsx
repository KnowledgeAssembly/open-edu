import { useEffect, useRef, useState } from 'react';
import { Send, Square, RotateCcw } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useStudioAssistant, useStudioChat } from '../ai';
import { StudioAssistantMessage } from './StudioAssistantMessage';
import { AssistantIntentRow } from './AssistantIntentRow';
import { useEditorBridge } from '../ai/EditorBridgeContext';
import type { DraftItem, ItemIntent, ItemIntentParams } from '../ai/types';

export function StudioAssistantChat() {
  const { t } = useTranslation();
  const { context, pendingDrafts, setPendingDrafts } = useStudioAssistant();
  const { messages, sendMessage, status, stop, regenerate, clearError, runIntent } = useStudioChat();
  const { currentEditor } = useEditorBridge();
  const [input, setInput] = useState('');
  const [intentRunning, setIntentRunning] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const preset = e.detail;
      if (preset.message) {
        sendMessage(preset.message);
      }
    };
    window.addEventListener('studio:assistant:preset', handler as EventListener);
    return () => window.removeEventListener('studio:assistant:preset', handler as EventListener);
  }, [sendMessage]);

  const aiAvailable = context?.aiAvailable !== false;

  const handleSend = () => {
    if (!input.trim() || !aiAvailable) return;
    clearError();
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUseDraft = (item: DraftItem) => {
    if (currentEditor) {
      currentEditor.applyToEditor(item);
    }
    setPendingDrafts(null);
  };

  const handleDiscardDraft = (_item: DraftItem) => {
    setPendingDrafts(null);
  };

  const handleIntent = async (intent: ItemIntent, params?: ItemIntentParams) => {
    if (!currentEditor || intentRunning) return;
    setIntentRunning(true);
    try {
      await runIntent(
        currentEditor.kind as 'lesson' | 'quiz' | 'practice',
        intent,
        currentEditor.getCurrentContent(),
        params,
      );
    } finally {
      setIntentRunning(false);
    }
  };

  if (context && !context.aiAvailable) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-6 text-center text-sm">
        {t('studio.assistant.unavailable')}
      </div>
    );
  }

  const isEditing = context?.view === 'edit-activity' && currentEditor;
  const editKind = isEditing ? (currentEditor!.kind as 'lesson' | 'quiz' | 'practice') : null;

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-on-surface-variant py-10 text-center text-sm">
            {t('studio.assistant.placeholder')}
          </div>
        ) : (
          messages.map((m) => (
            <StudioAssistantMessage
              key={m.id}
              role={m.role}
              content={m.content}
              metadata={(m as unknown as { metadata?: { mode?: 'explain' | 'draft'; drafts?: DraftItem[] } }).metadata}
              onUseDraft={handleUseDraft}
              onDiscardDraft={handleDiscardDraft}
              isDirty={currentEditor?.isDirty()}
            />
          ))
        )}
        {pendingDrafts && !messages.some((m) => (m as { metadata?: { drafts?: unknown } }).metadata?.drafts) ? (
          <div className="space-y-2">
            <p className="text-on-surface-variant text-xs">{t('studio.assistant.draft.previewLabel')}</p>
            {pendingDrafts.items.map((item, i) => (
              <StudioAssistantMessage
                key={`pending-${i}`}
                role="assistant"
                content=""
                metadata={{ mode: 'draft', drafts: [item] }}
                onUseDraft={handleUseDraft}
                onDiscardDraft={handleDiscardDraft}
                isDirty={currentEditor?.isDirty()}
              />
            ))}
          </div>
        ) : null}
        {status === 'loading' && (
          <div className="text-on-surface-variant mr-auto animate-pulse text-xs">
            {t('studio.assistant.thinking')}
          </div>
        )}
        {status === 'error' && (
          <div className="mx-auto text-center">
            <p className="text-error mb-2 text-xs">{t('studio.assistant.error.request')}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-primary hover:text-primary-container text-xs underline"
            >
              {t('studio.assistant.chat.retry')}
            </button>
          </div>
        )}
      </div>

      {isEditing && editKind ? (
        <AssistantIntentRow
          kind={editKind}
          onRunIntent={handleIntent}
          running={intentRunning || status === 'loading'}
        />
      ) : null}

      <div className="border-outline-variant bg-surface border-t p-4">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('studio.assistant.placeholder')}
            className="border-outline-variant bg-surface-container focus:ring-primary text-on-surface w-full resize-none rounded-md border p-2 pr-10 text-sm focus:outline-none focus:ring-1"
            rows={3}
            disabled={status === 'loading' || !aiAvailable}
          />
          <div className="absolute bottom-2 right-2 flex gap-1">
            {status === 'loading' ? (
              <button
                type="button"
                onClick={stop}
                className="text-on-surface-variant hover:text-on-surface p-1"
                aria-label={t('studio.assistant.chat.stop')}
              >
                <Square className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                className="text-primary hover:text-primary-container p-1 transition-colors"
                disabled={!input.trim() || !aiAvailable}
                aria-label={t('studio.assistant.chat.send')}
              >
                <Send className="size-4" />
              </button>
            )}
          </div>
        </div>
        {messages.length > 0 && status === 'idle' && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={regenerate}
              className="text-on-surface-variant hover:text-on-surface flex items-center gap-1 text-[10px]"
            >
              <RotateCcw className="size-3" />
              {t('studio.assistant.regenerate')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}