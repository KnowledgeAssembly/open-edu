import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QuizRenderer } from './QuizRenderer';
import type { QuizNode } from '@open-edu/schemas';

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

describe('QuizRenderer', () => {
  it('renders the question as a legend', () => {
    const quiz = makeQuiz();
    const { getByText } = render(<QuizRenderer node={quiz} onSubmit={vi.fn()} />);
    expect(getByText('What is 2 + 2?')).toBeInTheDocument();
  });

  it('renders all options as radio inputs', () => {
    const quiz = makeQuiz();
    const { container } = render(<QuizRenderer node={quiz} onSubmit={vi.fn()} />);
    const radios = container.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBe(3);
    expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
  });

  it('disables submit until an option is selected', () => {
    const quiz = makeQuiz();
    const { getByRole } = render(<QuizRenderer node={quiz} onSubmit={vi.fn()} />);
    const button = getByRole('button', { name: 'Submit' });
    expect(button).toBeDisabled();
  });

  it('enables submit after selecting an option', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText } = render(<QuizRenderer node={quiz} onSubmit={vi.fn()} />);
    fireEvent.click(getByLabelText('4'));
    expect(getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('scores a correct answer as 100 and calls onSubmit', () => {
    const quiz = makeQuiz();
    const onSubmit = vi.fn();
    const { getByRole, getByLabelText } = render(<QuizRenderer node={quiz} onSubmit={onSubmit} />);
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith(100, 'b');
  });

  it('scores an incorrect answer as 0 and calls onSubmit', () => {
    const quiz = makeQuiz();
    const onSubmit = vi.fn();
    const { getByRole, getByLabelText } = render(<QuizRenderer node={quiz} onSubmit={onSubmit} />);
    fireEvent.click(getByLabelText('3'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith(0, 'a');
  });

  it('shows correct feedback message for a correct answer', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, getByText } = render(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(getByText(/Correct!/)).toBeInTheDocument();
  });

  it('shows incorrect feedback message for a wrong answer', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, getByText } = render(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('3'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(getByText(/Incorrect/)).toBeInTheDocument();
  });

  it('disables all inputs after submission', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, container } = render(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    const radios = container.querySelectorAll('input[type="radio"]');
    radios.forEach((r) => expect(r).toBeDisabled());
  });

  it('hides the submit button after submission', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, queryByRole } = render(
      <QuizRenderer node={quiz} onSubmit={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(queryByRole('button', { name: 'Submit' })).toBeNull();
  });

  it('feedback region has aria-live polite for screen readers', () => {
    const quiz = makeQuiz();
    const { getByRole, getByLabelText, container } = render(
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
    const { getByRole, getByLabelText, container } = render(
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
});
