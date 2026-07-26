import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipiliMessage } from '../PipiliMessage.js';

describe('PipiliMessage', () => {
  const textParts = (text: string): Array<{ type: 'text'; text: string }> => [
    { type: 'text', text },
  ];

  it('renders user message text parts', () => {
    render(<PipiliMessage role="user" parts={textParts('Hello user')} />);
    expect(screen.getByText('Hello user')).toBeInTheDocument();
  });

  it('renders assistant message text parts', () => {
    render(<PipiliMessage role="assistant" parts={textParts('Hello assistant')} />);
    expect(screen.getByText('Hello assistant')).toBeInTheDocument();
  });

  it('shows streaming caret when isStreaming is true', () => {
    const { container } = render(
      <PipiliMessage role="assistant" parts={textParts('Streaming')} isStreaming />,
    );
    const caret = container.querySelector('.animate-pulse');
    expect(caret).toBeInTheDocument();
  });

  it('does not show caret when isStreaming is false', () => {
    const { container } = render(
      <PipiliMessage role="assistant" parts={textParts('Done')} isStreaming={false} />,
    );
    const caret = container.querySelector('.animate-pulse');
    expect(caret).not.toBeInTheDocument();
  });

  it('renders citations when metadata.citations provided', () => {
    render(
      <PipiliMessage
        role="assistant"
        parts={textParts('Response with citation')}
        metadata={{
          mode: 'tutor',
          citations: [{ source: 'lesson-1', text: 'Cited text', type: 'lesson' }],
          assessmentSafe: true,
          suggestedNextSteps: [],
        }}
      />,
    );
    expect(screen.getByTestId('pipili-citations')).toBeInTheDocument();
  });

  it('renders nothing for citations when metadata.citations is empty', () => {
    render(
      <PipiliMessage
        role="assistant"
        parts={textParts('Response')}
        metadata={{
          mode: 'tutor',
          citations: [],
          assessmentSafe: true,
          suggestedNextSteps: [],
        }}
      />,
    );
    expect(screen.queryByTestId('pipili-citations')).not.toBeInTheDocument();
  });

  it('renders hint level indicator when metadata.hintLevel is set', () => {
    render(
      <PipiliMessage
        role="assistant"
        parts={textParts('Hint response')}
        metadata={{
          mode: 'coach',
          citations: [],
          hintLevel: 2,
          assessmentSafe: true,
          suggestedNextSteps: [],
        }}
      />,
    );
    expect(screen.getByTestId('pipili-hint-level')).toBeInTheDocument();
  });

  it('renders suggested next steps when provided', () => {
    render(
      <PipiliMessage
        role="assistant"
        parts={textParts('Try the next exercise')}
        metadata={{
          mode: 'tutor',
          citations: [],
          assessmentSafe: true,
          suggestedNextSteps: ['Try the next exercise'],
        }}
      />,
    );
    expect(screen.getByTestId('pipili-next-steps')).toBeInTheDocument();
  });

  it('does not render next steps during streaming', () => {
    render(
      <PipiliMessage
        role="assistant"
        parts={textParts('Streaming...')}
        isStreaming
        metadata={{
          mode: 'tutor',
          citations: [],
          assessmentSafe: true,
          suggestedNextSteps: ['Try again'],
        }}
      />,
    );
    expect(screen.queryByTestId('pipili-next-steps')).not.toBeInTheDocument();
  });
});
