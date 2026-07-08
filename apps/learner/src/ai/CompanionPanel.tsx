import { useCallback } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@open-edu/design-system';
import { AIChat } from '@open-edu/design-system';
import type { ChatMessage } from '@open-edu/design-system';
import { X } from 'lucide-react';
import { useCompanion } from './CompanionProvider';
import type { ConversationMessage } from '@open-edu/ai-companion';

function toChatMessage(msg: ConversationMessage): ChatMessage {
  return {
    role: msg.role === 'system' ? 'ai' : msg.role,
    text: msg.text,
    citations: msg.citations,
  };
}

const suggestedQuestions = [
  'Can you explain what I just read?',
  'Summarize this lesson for me',
  'Give me a practice question',
  'What are the key concepts here?',
];

export function CompanionPanel(): JSX.Element {
  const { panelState, setPanelState, messages, isLoading, sendMessage } = useCompanion();

  const isOpen = panelState !== 'closed';

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const handleSuggestedQuestion = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setPanelState(open ? 'floating' : 'closed');
    },
    [setPanelState],
  );

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="sm:max-w-md md:max-w-lg" data-testid="companion-panel">
        <DrawerHeader className="border-outline-variant flex items-center justify-between border-b px-4 py-3">
          <DrawerTitle className="text-base font-semibold">AI Companion</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              className="hover:bg-surface-container-high text-on-surface-variant rounded-md p-1 transition-colors"
              aria-label="Close companion panel"
            >
              <X className="h-5 w-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="flex h-[60vh] flex-col sm:h-[70vh]">
          <AIChat
            messages={messages.map(toChatMessage)}
            onSend={handleSend}
            isThinking={isLoading}
            suggestedQuestions={messages.length === 0 ? suggestedQuestions : undefined}
            onSuggestedQuestionSelect={messages.length === 0 ? handleSuggestedQuestion : undefined}
            placeholder="Ask a question about this lesson..."
            className="h-full"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
