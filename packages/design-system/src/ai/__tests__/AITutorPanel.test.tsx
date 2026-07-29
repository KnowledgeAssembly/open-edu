import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AITutorPanel } from '../AITutorPanel.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('AITutorPanel', () => {
  it('renders AI Tutor heading', () => {
    render(<AITutorPanel />);
    expect(screen.getByText('AI Tutor')).toBeInTheDocument();
  });

  it('shows default message', () => {
    render(<AITutorPanel />);
    expect(
      screen.getByText("Hello! I'm your AI tutor. Ask me anything about this course."),
    ).toBeInTheDocument();
  });

  it('renders tabs (Ask AI, My Notes, Highlights)', () => {
    render(<AITutorPanel />);
    expect(screen.getByText('Ask AI')).toBeInTheDocument();
    expect(screen.getByText('My Notes')).toBeInTheDocument();
    expect(screen.getByText('Highlights')).toBeInTheDocument();
  });

  it('does not render when visible=false', () => {
    const { container } = render(<AITutorPanel visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('typing in textarea and clicking send adds user message', () => {
    render(<AITutorPanel />);
    const textarea = screen.getByTestId('ai-tutor-input');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByTestId('ai-tutor-send'));
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('hitting Enter (without Shift) sends message', () => {
    render(<AITutorPanel />);
    const textarea = screen.getByTestId('ai-tutor-input');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('Notes tab shows empty state', () => {
    render(<AITutorPanel />);
    fireEvent.click(screen.getByText('My Notes'));
    expect(screen.getByText('Your notes will appear here.')).toBeInTheDocument();
  });

  it('shows Pipili avatar instead of robot emoji for AI messages', () => {
    render(<AITutorPanel />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Pipili — idle');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<AITutorPanel />);
  });
});
