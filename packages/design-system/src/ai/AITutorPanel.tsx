import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils.js';
import { Textarea } from '../primitives/textarea.js';
import { Pipili } from '../primitives/pipili.js';

export interface AITutorPanelProps {
  visible?: boolean;
}

type ToolTab = 'ask-ai' | 'notes' | 'highlights';

const toolTabs: Array<{ id: ToolTab; label: string }> = [
  { id: 'ask-ai', label: 'Ask AI' },
  { id: 'notes', label: 'My Notes' },
  { id: 'highlights', label: 'Highlights' },
];

export function AITutorPanel({ visible = true }: AITutorPanelProps): JSX.Element | null {
  const [activeTool, setActiveTool] = useState<ToolTab>('ask-ai');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    { role: 'ai', text: "Hello! I'm your AI tutor. Ask me anything about this course." },
  ]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInputValue('');
    timerRef.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: "That's a great question! Let me help you understand this topic better.",
        },
      ]);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = toolTabs.findIndex((t) => t.id === activeTool);
    if (currentIndex === -1) return;
    let nextIndex: number;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % toolTabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + toolTabs.length) % toolTabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = toolTabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextTabId = toolTabs[nextIndex]!.id;
    setActiveTool(nextTabId);
    document.getElementById(nextTabId)?.focus();
  };

  const renderContent = () => {
    const panelId = activeTool + '-panel';

    switch (activeTool) {
      case 'notes':
        return (
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={activeTool}
            className="flex-1 overflow-hidden"
          >
            <div className="text-on-surface-variant px-4 py-6 text-center text-sm leading-relaxed">
              Your notes will appear here.
            </div>
          </div>
        );
      case 'highlights':
        return (
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={activeTool}
            className="flex-1 overflow-hidden"
          >
            <div className="text-on-surface-variant px-4 py-6 text-center text-sm leading-relaxed">
              Your highlights will appear here.
            </div>
          </div>
        );
      case 'ask-ai':
      default:
        return (
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={activeTool}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div
              className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
              data-testid="ai-tutor-chat"
              aria-live="polite"
            >
              {messages.map((msg, idx) =>
                msg.role === 'ai' ? (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="bg-primary-container flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                      <Pipili size="xs" mood="idle" />
                    </div>
                    <div className="bg-surface-container text-on-surface max-w-[80%] rounded-[12px_12px_12px_4px] px-3.5 py-2.5 text-xs leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={idx} className="flex items-start justify-end gap-2">
                    <div className="bg-primary text-on-primary max-w-[80%] rounded-[12px_12px_4px_12px] px-3.5 py-2.5 text-xs leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="border-outline-variant flex items-end gap-2 border-t px-4 py-3">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={1}
                className="max-h-30 min-h-9 resize-none"
                aria-label="Ask a question"
                data-testid="ai-tutor-input"
              />
              <button
                type="button"
                className="bg-primary text-on-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition-opacity hover:opacity-90"
                onClick={handleSend}
                aria-label="Send message"
                data-testid="ai-tutor-send"
              >
                {'↑'}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <aside
      className="w-panel-explorer bg-surface-container-low border-outline-variant flex h-full flex-col overflow-hidden border-l font-sans"
      data-testid="ai-tutor-panel"
      aria-label="AI Tutor panel"
    >
      <div className="border-outline-variant border-b px-4 pb-2 pt-4">
        <h2 className="text-on-surface m-0 text-base font-bold leading-tight">AI Tutor</h2>
        <p className="text-on-surface-variant mb-0 mt-0.5 text-xs leading-tight">
          Context-aware assistant
        </p>
      </div>

      <div
        className="border-outline-variant flex gap-1 border-b px-4 py-2"
        role="tablist"
        aria-label="AI Tutor tools"
        onKeyDown={handleTabKeyDown}
      >
        {toolTabs.map((tab) => (
          <button
            key={tab.id}
            id={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTool === tab.id}
            aria-controls={tab.id + '-panel'}
            className={cn(
              'flex-1 cursor-pointer whitespace-nowrap rounded-md border-none bg-transparent px-3 py-1.5 font-sans text-xs font-medium transition-[background-color,color] duration-200',
              activeTool === tab.id
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant',
            )}
            onClick={() => setActiveTool(tab.id)}
            data-testid={`ai-tutor-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </aside>
  );
}

AITutorPanel.displayName = 'AITutorPanel';
