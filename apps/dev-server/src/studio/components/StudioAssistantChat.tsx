import { useState } from 'react';
import { Send, Square, RotateCcw } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useStudioAssistant, useStudioChat } from '../ai';
import { StudioAssistantMessage } from './StudioAssistantMessage';

export function StudioAssistantChat() {
  const { t } = useTranslation();
  const { context } = useStudioAssistant();
  const { messages, sendMessage, status, stop, regenerate, clearError } = useStudioChat();
  const [input, setInput] = useState('');

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

  if (context && !context.aiAvailable) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-6 text-center text-sm">
        {t('studio.assistant.unavailable')}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-on-surface-variant py-10 text-center text-sm">
            {t('studio.assistant.placeholder')}
          </div>
        ) : (
          messages.map((m) => (
            <StudioAssistantMessage key={m.id} role={m.role} content={m.content} />
          ))
        )}
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
