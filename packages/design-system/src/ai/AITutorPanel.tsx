import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils.js';
import { Textarea } from '../primitives/textarea.js';

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
            <div className="text-center px-4 py-6 text-sm text-on-surface-variant leading-relaxed">
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
            <div className="text-center px-4 py-6 text-sm text-on-surface-variant leading-relaxed">
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
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
              data-testid="ai-tutor-chat"
              aria-live="polite"
            >
              {messages.map((msg, idx) =>
                msg.role === 'ai' ? (
                  <div key={idx} className="flex gap-2 items-start">
                    <span
                      className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-sm shrink-0"
                      aria-hidden="true"
                    >
                      {'🤖'}
                    </span>
                    <div className="max-w-[80%] px-3.5 py-2.5 text-xs leading-relaxed bg-surface-container text-on-surface rounded-[12px_12px_12px_4px]">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={idx} className="flex gap-2 items-start justify-end">
                    <div className="max-w-[80%] px-3.5 py-2.5 text-xs leading-relaxed bg-primary text-on-primary rounded-[12px_12px_4px_12px]">
                      {msg.text}
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="px-4 py-3 border-t border-outline-variant flex gap-2 items-end">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={1}
                className="min-h-9 max-h-30 resize-none"
                aria-label="Ask a question"
                data-testid="ai-tutor-input"
              />
              <button
                type="button"
                className="bg-primary text-on-primary w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 hover:opacity-90 transition-opacity"
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
      className="w-panel-explorer h-full flex flex-col bg-surface-container-low border-l border-outline-variant font-sans overflow-hidden"
      data-testid="ai-tutor-panel"
      aria-label="AI Tutor panel"
    >
      <div className="px-4 pt-4 pb-2 border-b border-outline-variant">
        <h2 className="text-base font-bold m-0 text-on-surface leading-tight">AI Tutor</h2>
        <p className="text-xs text-on-surface-variant mt-0.5 mb-0 leading-tight">
          Context-aware assistant
        </p>
      </div>

      <div
        className="flex gap-1 px-4 py-2 border-b border-outline-variant"
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
              'flex-1 px-3 py-1.5 border-none rounded-md bg-transparent cursor-pointer text-xs font-medium font-sans whitespace-nowrap transition-[background-color,color] duration-200',
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
