import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIChat } from '../AIChat.jsx';
import type { ChatMessage } from '../AIChat.jsx';
import { checkAccessibility } from '../../test-utils/a11y.js';

describe('AIChat', () => {
  const messages: ChatMessage[] = [
    { role: 'user', text: 'Hello' },
    { role: 'ai', text: 'Hi there!' },
  ];

  it('renders messages using TutorMessage', () => {
    render(<AIChat messages={messages} onSend={() => {}} />);
    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there!')).toBeDefined();
  });

  it('shows ThinkingIndicator when isThinking', () => {
    render(<AIChat messages={messages} onSend={() => {}} isThinking />);
    expect(screen.getByTestId('thinking-indicator')).toBeDefined();
  });

  it('shows SuggestedQuestions when provided', () => {
    const onSelect = vi.fn();
    render(
      <AIChat
        messages={[]}
        onSend={() => {}}
        suggestedQuestions={['Ask me']}
        onSuggestedQuestionSelect={onSelect}
      />,
    );
    expect(screen.getByTestId('suggested-questions')).toBeDefined();
  });

  it('sending a message calls onSend', () => {
    const onSend = vi.fn();
    render(<AIChat messages={[]} onSend={onSend} />);
    const input = screen.getByTestId('ai-chat-input');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByTestId('ai-chat-send'));
    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('Enter key sends message (without Shift)', () => {
    const onSend = vi.fn();
    render(<AIChat messages={[]} onSend={onSend} />);
    const input = screen.getByTestId('ai-chat-input');
    fireEvent.change(input, { target: { value: 'Enter send' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('Enter send');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<AIChat messages={[]} onSend={vi.fn()} />);
  });
});
