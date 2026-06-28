import * as React from 'react';
import { cn } from '../lib/utils.js';
import { Textarea } from '../primitives/textarea.js';
import { TutorMessage } from './TutorMessage.js';
import { Citation } from './Citation.js';
import { ThinkingIndicator } from './ThinkingIndicator.js';
import { SuggestedQuestions } from './SuggestedQuestions.js';

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  citations?: Array<{ source: string; text: string }>;
}

export interface AIChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  placeholder?: string;
  isThinking?: boolean;
  suggestedQuestions?: string[];
  onSuggestedQuestionSelect?: (question: string) => void;
  className?: string;
}

export function AIChat({
  messages,
  onSend,
  placeholder = 'Ask a question...',
  isThinking = false,
  suggestedQuestions,
  onSuggestedQuestionSelect,
  className,
}: AIChatProps): JSX.Element {
  const [input, setInput] = React.useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showSuggestedQuestions =
    suggestedQuestions &&
    suggestedQuestions.length > 0 &&
    onSuggestedQuestionSelect &&
    (messages.length === 0 || !isThinking);

  return (
    <div className={cn('flex flex-col', className)} data-testid="ai-chat">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index}>
            <TutorMessage role={message.role}>{message.text}</TutorMessage>
            {message.citations && message.citations.length > 0 && (
              <div className="ml-8 mt-2 space-y-2">
                {message.citations.map((citation, ci) => (
                  <Citation key={ci} source={citation.source}>
                    {citation.text}
                  </Citation>
                ))}
              </div>
            )}
          </div>
        ))}
        {isThinking && <ThinkingIndicator />}
        {showSuggestedQuestions && (
          <SuggestedQuestions questions={suggestedQuestions} onSelect={onSuggestedQuestionSelect} />
        )}
      </div>
      <div className="flex items-end gap-2 border-t border-outline-variant p-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          className="min-h-11 resize-none"
          data-testid="ai-chat-input"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={cn(
            'flex h-10 items-center gap-1 rounded-md bg-primary px-4 text-sm font-medium text-on-primary',
            'transition-colors hover:bg-primary-hover disabled:opacity-50',
          )}
          data-testid="ai-chat-send"
        >
          Send
        </button>
      </div>
    </div>
  );
}
AIChat.displayName = 'AIChat';
