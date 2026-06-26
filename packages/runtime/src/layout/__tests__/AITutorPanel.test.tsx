import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AITutorPanel } from '../AITutorPanel.js';

describe('AITutorPanel', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(<AITutorPanel visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders panel when visible is true', () => {
    render(<AITutorPanel visible={true} />);
    expect(screen.getByTestId('ai-tutor-panel')).toBeInTheDocument();
  });

  it('renders header title and subtitle', () => {
    render(<AITutorPanel />);
    expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    expect(screen.getByText('Context-aware assistant')).toBeInTheDocument();
  });

  it('renders all tool tabs', () => {
    render(<AITutorPanel />);
    expect(screen.getByText('Ask AI')).toBeInTheDocument();
    expect(screen.getByText('My Notes')).toBeInTheDocument();
    expect(screen.getByText('Highlights')).toBeInTheDocument();
  });

  it('shows chat area and input by default', () => {
    render(<AITutorPanel />);
    expect(screen.getByTestId('ai-tutor-chat')).toBeInTheDocument();
    expect(screen.getByTestId('ai-tutor-input')).toBeInTheDocument();
    expect(screen.getByTestId('ai-tutor-send')).toBeInTheDocument();
  });

  it('shows AI welcome message', () => {
    render(<AITutorPanel />);
    expect(screen.getByText(/Hello! I'm your AI tutor/)).toBeInTheDocument();
  });

  it('switching to Notes tab shows empty state', () => {
    render(<AITutorPanel />);
    fireEvent.click(screen.getByTestId('ai-tutor-tab-notes'));
    expect(screen.getByText('Your notes will appear here.')).toBeInTheDocument();
  });

  it('switching to Highlights tab shows empty state', () => {
    render(<AITutorPanel />);
    fireEvent.click(screen.getByTestId('ai-tutor-tab-highlights'));
    expect(screen.getByText('Your highlights will appear here.')).toBeInTheDocument();
  });

  it('typing in input and clicking send adds user message', () => {
    render(<AITutorPanel />);
    const input = screen.getByTestId('ai-tutor-input') as HTMLTextAreaElement;
    const sendBtn = screen.getByTestId('ai-tutor-send');

    fireEvent.change(input, { target: { value: 'What is X?' } });
    fireEvent.click(sendBtn);

    expect(screen.getByText('What is X?')).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  it('sending empty text does nothing', () => {
    render(<AITutorPanel />);
    const sendBtn = screen.getByTestId('ai-tutor-send');
    fireEvent.click(sendBtn);
    expect(screen.queryByTestId('ai-tutor-chat')?.children.length).toBe(1);
  });

  it('pressing Enter sends message', () => {
    render(<AITutorPanel />);
    const input = screen.getByTestId('ai-tutor-input');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('pressing Shift+Enter does not send', () => {
    render(<AITutorPanel />);
    const chat = screen.getByTestId('ai-tutor-chat');
    const initialCount = chat.children.length;

    fireEvent.change(screen.getByTestId('ai-tutor-input'), { target: { value: 'Multiline' } });
    fireEvent.keyDown(screen.getByTestId('ai-tutor-input'), { key: 'Enter', shiftKey: true });

    expect(chat.children.length).toBe(initialCount);
  });

  it('has aria-label on aside', () => {
    render(<AITutorPanel />);
    expect(screen.getByTestId('ai-tutor-panel').getAttribute('aria-label')).toBe('AI Tutor panel');
  });

  it('tool tabs have role="tab" and aria-selected', () => {
    render(<AITutorPanel />);
    const askAiTab = screen.getByTestId('ai-tutor-tab-ask-ai');
    expect(askAiTab.getAttribute('role')).toBe('tab');
    expect(askAiTab.getAttribute('aria-selected')).toBe('true');

    const notesTab = screen.getByTestId('ai-tutor-tab-notes');
    expect(notesTab.getAttribute('aria-selected')).toBe('false');
  });

  it('tab buttons have aria-controls pointing to panel', () => {
    render(<AITutorPanel />);
    const askAiTab = screen.getByTestId('ai-tutor-tab-ask-ai');
    expect(askAiTab.getAttribute('aria-controls')).toBe('ask-ai-panel');

    const panel = document.getElementById('ask-ai-panel');
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute('role')).toBe('tabpanel');
    expect(panel?.getAttribute('aria-labelledby')).toBe('ask-ai');
  });

  it('only active tabpanel is rendered', () => {
    render(<AITutorPanel />);
    expect(document.getElementById('ask-ai-panel')).toBeTruthy();
    expect(document.getElementById('notes-panel')).toBeNull();
    expect(document.getElementById('highlights-panel')).toBeNull();
  });

  it('ArrowRight switches to next tab', () => {
    render(<AITutorPanel />);
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByTestId('ai-tutor-tab-notes').getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowLeft switches to previous tab', () => {
    render(<AITutorPanel />);
    fireEvent.click(screen.getByTestId('ai-tutor-tab-highlights'));
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(screen.getByTestId('ai-tutor-tab-notes').getAttribute('aria-selected')).toBe('true');
  });

  it('Home key goes to first tab', () => {
    render(<AITutorPanel />);
    fireEvent.click(screen.getByTestId('ai-tutor-tab-highlights'));
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(screen.getByTestId('ai-tutor-tab-ask-ai').getAttribute('aria-selected')).toBe('true');
  });

  it('End key goes to last tab', () => {
    render(<AITutorPanel />);
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(screen.getByTestId('ai-tutor-tab-highlights').getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('chat area has aria-live="polite"', () => {
    render(<AITutorPanel />);
    expect(screen.getByTestId('ai-tutor-chat').getAttribute('aria-live')).toBe('polite');
  });
});
