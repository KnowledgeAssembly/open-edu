import { Pipili } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export interface ChatBubbleDemoProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

export function ChatBubbleDemo({ messages, isTyping }: ChatBubbleDemoProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      aria-live="polite"
      data-testid="chat-bubble-demo"
      className="max-h-80 space-y-3 overflow-y-auto"
    >
      {messages.map((message) => (
        <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {message.role === 'ai' ? (
            <div className="flex items-start gap-2">
              <Pipili size="sm" aria-hidden="true" className="mt-1 shrink-0" />
              <p className="bg-surface-variant text-on-surface max-w-[75%] rounded-2xl rounded-tl-sm p-3 text-sm leading-relaxed">
                {message.text}
              </p>
            </div>
          ) : (
            <div className="flex justify-end">
              <p className="bg-primary text-primary-foreground ml-auto max-w-[75%] rounded-2xl rounded-tr-sm p-3 text-sm leading-relaxed">
                {message.text}
              </p>
            </div>
          )}
        </div>
      ))}

      {isTyping ? (
        <div
          role="status"
          aria-label={t('website.ai.typing')}
          data-testid="typing-indicator"
          className="animate-in fade-in flex items-start gap-2"
        >
          <Pipili size="sm" mood="thinking" aria-hidden="true" className="mt-1 shrink-0" />
          <span
            aria-hidden="true"
            className="bg-surface-variant text-on-surface flex items-center gap-1 rounded-2xl rounded-tl-sm p-3"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
          </span>
        </div>
      ) : null}
    </div>
  );
}

ChatBubbleDemo.displayName = 'ChatBubbleDemo';
