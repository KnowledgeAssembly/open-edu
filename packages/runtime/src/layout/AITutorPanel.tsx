import { useState, type CSSProperties } from 'react';

export interface AITutorPanelProps {
  visible?: boolean;
}

type ToolTab = 'ask-ai' | 'notes' | 'highlights';

const toolTabs: Array<{ id: ToolTab; label: string }> = [
  { id: 'ask-ai', label: 'Ask AI' },
  { id: 'notes', label: 'My Notes' },
  { id: 'highlights', label: 'Highlights' },
];

const containerStyle: CSSProperties = {
  width: 'var(--oe-space-panel-explorer, 320px)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--oe-color-surface-container-low, #f7f2fa)',
  borderLeft: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
  fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  padding: '16px 16px 8px',
  borderBottom: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
};

const headerTitleStyle: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  margin: 0,
  color: 'var(--oe-color-fg, #1a1a1a)',
  lineHeight: 1.3,
};

const headerSubtitleStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
  margin: '2px 0 0',
  lineHeight: 1.3,
};

const tabBarStyle: CSSProperties = {
  display: 'flex',
  gap: '4px',
  padding: '8px 16px',
  borderBottom: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
};

const tabBaseStyle: CSSProperties = {
  flex: 1,
  padding: '6px 12px',
  border: 'none',
  borderRadius: 'var(--oe-radius, 8px)',
  background: 'none',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontFamily: 'inherit',
  fontWeight: 500,
  color: 'var(--oe-color-on-surface-variant, #49454f)',
  transition: 'background-color 200ms ease, color 200ms ease',
  whiteSpace: 'nowrap',
};

const tabActiveStyle: CSSProperties = {
  ...tabBaseStyle,
  backgroundColor: 'var(--oe-color-secondary-container, #e8def8)',
  color: 'var(--oe-color-on-secondary-container, #1d192b)',
};

const chatAreaStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const messageRowAiStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-start',
};

const messageRowUserStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-start',
  justifyContent: 'flex-end',
};

const botIconStyle: CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: 'var(--oe-color-primary-container, #eaddff)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.875rem',
  flexShrink: 0,
};

const bubbleAiStyle: CSSProperties = {
  maxWidth: '80%',
  padding: '10px 14px',
  borderRadius: '12px 12px 12px 4px',
  backgroundColor: 'var(--oe-color-surface-container, #f0edee)',
  color: 'var(--oe-color-fg, #1a1a1a)',
  fontSize: '0.8125rem',
  lineHeight: 1.5,
};

const bubbleUserStyle: CSSProperties = {
  maxWidth: '80%',
  padding: '10px 14px',
  borderRadius: '12px 12px 4px 12px',
  backgroundColor: 'var(--oe-color-primary, #6750a4)',
  color: 'var(--oe-color-on-primary, #ffffff)',
  fontSize: '0.8125rem',
  lineHeight: 1.5,
};

const inputAreaStyle: CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-end',
};

const textareaStyle: CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  border: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
  borderRadius: 'var(--oe-radius, 8px)',
  backgroundColor: 'var(--oe-color-surface, #fef7ff)',
  color: 'var(--oe-color-fg, #1a1a1a)',
  fontFamily: 'inherit',
  fontSize: '0.8125rem',
  lineHeight: 1.4,
  resize: 'none',
  minHeight: '36px',
  maxHeight: '120px',
  outline: 'none',
  boxSizing: 'border-box',
};

const sendButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  border: 'none',
  borderRadius: '50%',
  backgroundColor: 'var(--oe-color-primary, #6750a4)',
  color: 'var(--oe-color-on-primary, #ffffff)',
  cursor: 'pointer',
  fontSize: '1rem',
  flexShrink: 0,
};

const emptyStateStyle: CSSProperties = {
  textAlign: 'center',
  padding: '24px 16px',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
  fontSize: '0.875rem',
  lineHeight: 1.5,
};

export function AITutorPanel({ visible = true }: AITutorPanelProps): JSX.Element | null {
  const [activeTool, setActiveTool] = useState<ToolTab>('ask-ai');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    { role: 'ai', text: "Hello! I'm your AI tutor. Ask me anything about this course." },
  ]);

  if (!visible) return null;

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInputValue('');
    setTimeout(() => {
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

  const renderContent = () => {
    switch (activeTool) {
      case 'notes':
        return <div style={emptyStateStyle}>Your notes will appear here.</div>;
      case 'highlights':
        return <div style={emptyStateStyle}>Your highlights will appear here.</div>;
      case 'ask-ai':
      default:
        return (
          <>
            <div style={chatAreaStyle} data-testid="ai-tutor-chat">
              {messages.map((msg, idx) =>
                msg.role === 'ai' ? (
                  <div key={idx} style={messageRowAiStyle}>
                    <div style={botIconStyle} aria-hidden="true">
                      {'\uD83E\uDD16'}
                    </div>
                    <div style={bubbleAiStyle}>{msg.text}</div>
                  </div>
                ) : (
                  <div key={idx} style={messageRowUserStyle}>
                    <div style={bubbleUserStyle}>{msg.text}</div>
                  </div>
                ),
              )}
            </div>
            <div style={inputAreaStyle}>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={1}
                style={textareaStyle}
                aria-label="Ask a question"
                data-testid="ai-tutor-input"
              />
              <button
                type="button"
                style={sendButtonStyle}
                onClick={handleSend}
                aria-label="Send message"
                data-testid="ai-tutor-send"
              >
                {'\u2191'}
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <aside style={containerStyle} data-testid="ai-tutor-panel" aria-label="AI Tutor panel">
      <div style={headerStyle}>
        <h2 style={headerTitleStyle}>AI Tutor</h2>
        <p style={headerSubtitleStyle}>Context-aware assistant</p>
      </div>

      <div style={tabBarStyle} role="tablist" aria-label="AI Tutor tools">
        {toolTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTool === tab.id}
            style={activeTool === tab.id ? tabActiveStyle : tabBaseStyle}
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
