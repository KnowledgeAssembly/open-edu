import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssistantIntentRow } from './AssistantIntentRow';

vi.mock('@open-edu/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@open-edu/design-system', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

describe('AssistantIntentRow', () => {
  it('renders lesson intents', () => {
    render(
      <AssistantIntentRow
        kind="lesson"
        onRunIntent={vi.fn()}
        running={false}
      />,
    );

    expect(screen.getByText('studio.assistant.intent.rewrite')).toBeTruthy();
    expect(screen.getByText('studio.assistant.intent.expand')).toBeTruthy();
    expect(screen.getByText('studio.assistant.intent.fix-quality')).toBeTruthy();
  });

  it('renders quiz intents', () => {
    render(
      <AssistantIntentRow
        kind="quiz"
        onRunIntent={vi.fn()}
        running={false}
      />,
    );

    expect(screen.getByText('studio.assistant.intent.rewrite')).toBeTruthy();
    expect(screen.getByText('studio.assistant.intent.add-questions')).toBeTruthy();
  });

  it('renders practice intents', () => {
    render(
      <AssistantIntentRow
        kind="practice"
        onRunIntent={vi.fn()}
        running={false}
      />,
    );

    expect(screen.getByText('studio.assistant.intent.improve-prompt')).toBeTruthy();
  });

  it('disables buttons when running', () => {
    render(
      <AssistantIntentRow
        kind="lesson"
        onRunIntent={vi.fn()}
        running={true}
      />,
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});