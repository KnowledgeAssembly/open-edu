import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QuizRenderer } from './QuizRenderer';
import type { QuizNode } from '@open-edu/schemas';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';

function makeQuiz(overrides: Partial<QuizNode> = {}): QuizNode {
  return {
    type: 'quiz',
    question: 'What is 2 + 2?',
    options: [
      { id: 'a', text: '3', correct: false },
      { id: 'b', text: '4', correct: true },
      { id: 'c', text: '5', correct: false },
    ],
    ...overrides,
  } as QuizNode;
}

function renderWithI18n(ui: ReactNode) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('QuizRenderer', () => {
  it('renders the question as a legend', () => {
    const quiz = makeQuiz();
    const { getByText } = renderWithI18n(<QuizRenderer node={quiz} onSubmit={vi.fn()} />);
    expect(getByText('What is 2 + 2?')).toBeInTheDocument();
  });

  it('renders all options as radio inputs', () => {
    const quiz = makeQuiz();
    const { container } = renderWithI18n(<QuizRenderer node={quiz} onSubmit={vi.fn()} />);
    const radios = container.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBe(3);
    expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
  });

  it('disables submit until an option is selected', () => {
    const quiz = makeQuiz();
    const { getByRole } = renderWithI18n(<QuizRenderer node={quiz} onSubmit={vi.fn()} />);
    const button = getByRole('button', { name: 'Submit' });
    expect(button).toBeDisabled();
  });

  it('enables submit after selecting an option', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('4'));
    expect(getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('scores a correct answer as 100 and calls onSubmit', () => {
    const quiz = makeQuiz();
    const onSubmit = vi.fn();
    const { getByRole, getByLabelText } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={onSubmit} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith(100, 'b');
  });

  it('scores an incorrect answer as 0 and calls onSubmit', () => {
    const quiz = makeQuiz();
    const onSubmit = vi.fn();
    const { getByRole, getByLabelText } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={onSubmit} />,
    );
    fireEvent.click(getByLabelText('3'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith(0, 'a');
  });

  it('shows correct feedback message for a correct answer', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, getByText } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(getByText(/Correct!/)).toBeInTheDocument();
  });

  it('shows incorrect feedback message for a wrong answer', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, getByText } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('3'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(getByText(/Incorrect/)).toBeInTheDocument();
  });

  it('disables all inputs after submission', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, container } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    const radios = container.querySelectorAll('input[type="radio"]');
    radios.forEach((r) => expect(r).toBeDisabled());
  });

  it('hides the submit button after submission', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, queryByRole } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(queryByRole('button', { name: 'Submit' })).toBeNull();
  });

  it('feedback region has aria-live polite for screen readers', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, container } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    const status = container.querySelector('[aria-live="polite"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
  });

  it('highlights the correct answer after submission', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, container } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('3'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    const correctLabel = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Correct answer'),
    );
    expect(correctLabel).not.toBeUndefined();
    expect(correctLabel?.textContent).toContain('4');
  });

  it('restores previous answer from storedAnswer prop', () => {
    const quiz = makeQuiz();
    const storedAnswer = { type: 'quiz' as const, selectedOptionId: 'b', score: 100 };
    const { container, getByText, queryByRole } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} storedAnswer={storedAnswer} />,
    );
    const selectedRadio = container.querySelector(
      'input[type="radio"]:checked',
    ) as HTMLInputElement;
    expect(selectedRadio).not.toBeNull();
    expect(selectedRadio.value).toBe('b');
    expect(queryByRole('button', { name: 'Submit' })).toBeNull();
    expect(getByText(/Correct!/)).toBeInTheDocument();
  });

  it('calls onAnswer when submitting', () => {
    const quiz = makeQuiz();
    const onAnswer = vi.fn();
    const { getByRole, getByLabelText } = renderWithI18n(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} onAnswer={onAnswer} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(onAnswer).toHaveBeenCalledWith({ type: 'quiz', selectedOptionId: 'b', score: 100 });
  });
});
