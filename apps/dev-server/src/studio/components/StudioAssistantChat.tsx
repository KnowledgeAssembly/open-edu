import { useState } from 'react';
import { Send, Square, RotateCcw } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { cn } from '@open-edu/design-system';
import { useStudioChat } from '../ai';

export function StudioAssistantChat() {
  const { t } = useTranslation();
  const { messages, sendMessage, status, stop, regenerate, clearError } = useStudioChat();
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-muted-foreground py-10 text-center text-sm">
            {t('studio.assistant.placeholder')}
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted text-foreground mr-auto',
              )}
            >
              {m.content}
            </div>
          ))
        )}
        {status === 'loading' && (
          <div className="text-muted-foreground mr-auto animate-pulse text-xs">
            {t('studio.assistant.thinking')}
          </div>
        )}
        {status === 'error' && (
          <div className="mx-auto text-center">
            <p className="text-destructive mb-2 text-xs">{t('studio.assistant.error.request')}</p>
            <button
              onClick={clearError}
              className="text-primary hover:text-primary/80 text-xs underline"
            >
              {t('studio.assistant.chat.retry')}
            </button>
          </div>
        )}
      </div>

      <div className="border-border bg-background border-t p-4">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('studio.assistant.placeholder')}
            className="border-border bg-muted/50 focus:ring-primary w-full resize-none rounded-md border p-2 pr-10 text-sm focus:outline-none focus:ring-1"
            rows={3}
            disabled={status === 'loading'}
          />
          <div className="absolute bottom-2 right-2 flex gap-1">
            {status === 'loading' ? (
              <button
                onClick={stop}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label={t('studio.assistant.chat.stop')}
              >
                <Square className="size-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                className="text-primary hover:text-primary/80 p-1 transition-colors"
                disabled={!input.trim()}
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
              onClick={regenerate}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px]"
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