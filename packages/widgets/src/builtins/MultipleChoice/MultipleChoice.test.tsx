import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { multipleChoice, multipleChoicePractice } from './MultipleChoice';

const WidgetComponent = multipleChoice.render;

function renderWidget(config: Record<string, unknown> = {}) {
  const emitInteraction = vi.fn();
  const complete = vi.fn();
  const result = render(
    <WidgetComponent
      nodeId="test-node"
      config={config}
      emitInteraction={emitInteraction}
      complete={complete}
    />,
  );
  return { emitInteraction, complete, ...result };
}

describe('MultipleChoice widget definition', () => {
  it('has correct widget id for multipleChoice', () => {
    expect(multipleChoice.id).toBe('core.multiple-choice');
  });

  it('has correct widget id for multipleChoicePractice alias', () => {
    expect(multipleChoicePractice.id).toBe('open-edu.multiple-choice-practice');
  });

  it('has a render function', () => {
    expect(typeof multipleChoice.render).toBe('function');
  });

  it('alias has a render function', () => {
    expect(typeof multipleChoicePractice.render).toBe('function');
  });
});

describe('MultipleChoice legacy single-question mode', () => {
  const baseConfig = {
    prompt: 'What is 2 + 2?',
    options: [
      { id: 'a', text: '3', correct: false },
      { id: 'b', text: '4', correct: true },
      { id: 'c', text: '5', correct: false },
    ],
  };

  it('renders prompt and options', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByLabelText('3')).toBeInTheDocument();
    expect(screen.getByLabelText('4')).toBeInTheDocument();
    expect(screen.getByLabelText('5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('completes with score 100 on correct answer', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Correct!');
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('completes with score 0 on incorrect answer', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Incorrect');
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('shows explanation after submission', () => {
    renderWidget({ ...baseConfig, explanation: '2 + 2 equals 4.' });
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText('2 + 2 equals 4.')).toBeInTheDocument();
  });

  it('renders error message for invalid config', () => {
    renderWidget({ prompt: '' });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for missing options', () => {
    renderWidget({ prompt: 'What?' });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for completely empty config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('disables inputs after submission', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByLabelText('3')).toBeDisabled();
    expect(screen.getByLabelText('4')).toBeDisabled();
    expect(screen.getByLabelText('5')).toBeDisabled();
  });
});

describe('MultipleChoice multi-question interactive mode', () => {
  const multiConfig = {
    questions: [
      { question: 'What is 2 + 2?', options: ['3', '4', '5'], correctIndex: 1 },
      { question: 'What is 3 * 3?', options: ['6', '9', '12'], correctIndex: 1 },
    ],
    interactive: true,
  };

  it('renders first question with options', () => {
    renderWidget(multiConfig);
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByLabelText('3')).toBeInTheDocument();
    expect(screen.getByLabelText('4')).toBeInTheDocument();
    expect(screen.getByLabelText('5')).toBeInTheDocument();
  });

  it('shows question progress for multi-question mode', () => {
    renderWidget(multiConfig);
    expect(screen.getByTestId('question-progress')).toHaveTextContent('Question 1 of 2');
  });

  it('shows "Next" button for intermediate questions', () => {
    renderWidget(multiConfig);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Next');
  });

  it('shows "Submit" on last question', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Correct!');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('What is 3 * 3?')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Submit');
  });

  it('Next button disabled without selection', () => {
    renderWidget(multiConfig);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows per-question feedback before advancing', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Correct!');
    expect(screen.queryByText('What is 3 * 3?')).not.toBeInTheDocument();
  });

  it('shows feedback with explanation when available', () => {
    const configWithExplanation = {
      questions: [
        {
          question: 'What is 2 + 2?',
          options: ['3', '4', '5'],
          correctIndex: 1,
          explanation: 'Two plus two equals four.',
        },
        { question: 'What is 3 * 3?', options: ['6', '9', '12'], correctIndex: 1 },
      ],
      interactive: true,
    };
    renderWidget(configWithExplanation);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Two plus two equals four.');
  });

  it('shows incorrect feedback with correct answer', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Incorrect');
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('The correct answer is: 4');
  });

  it('advances to next question after feedback Next', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Correct!');
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByText('What is 3 * 3?')).toBeInTheDocument();
  });

  it('emits answer interaction on each question', () => {
    const { emitInteraction } = renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'answer',
        questionIndex: 0,
        selectedIndex: 1,
        correct: true,
      }),
    );
  });

  it('emits submit interaction with accuracy on completion', () => {
    const { emitInteraction, complete } = renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('9'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(emitInteraction).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'submit',
        correctCount: 2,
        totalQuestions: 2,
        accuracy: 1,
      }),
    );
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows aggregate score on completion with all correct', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('9'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByTestId('multi-result')).toHaveTextContent('You got 2 of 2 correct.');
  });

  it('shows aggregate score on completion with some incorrect', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('9'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByTestId('multi-result')).toHaveTextContent('You got 1 of 2 correct.');
  });

  it('handles single question in multi format', () => {
    renderWidget({
      questions: [{ question: 'What is 2 + 2?', options: ['3', '4', '5'], correctIndex: 1 }],
      interactive: true,
    });
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Submit');
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(btn);
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Correct!');
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByTestId('multi-result')).toHaveTextContent('You got 1 of 1 correct.');
  });

  it('uses widgetId in interactions', () => {
    const { emitInteraction } = renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'core.multiple-choice' }),
    );
  });

  it('keeps correct option readable after feedback (not greyed out)', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const correctOption = screen.getByTestId('correct-option');
    expect(correctOption).toHaveTextContent('4');
    expect(correctOption).not.toHaveClass('opacity-60');
  });
});

describe('MultipleChoice multi-question observe mode', () => {
  const observeConfig = {
    questions: [
      { question: 'What is 2 + 2?', options: ['3', '4', '5'], correctIndex: 1 },
      { question: 'What is 3 * 3?', options: ['6', '9', '12'], correctIndex: 1 },
    ],
  };

  it('shows first question with correct answer highlighted', () => {
    renderWidget(observeConfig);
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    const correctRadio = screen.getByLabelText('Correct answer: 4');
    expect(correctRadio).toBeChecked();
    expect(correctRadio).toBeDisabled();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('has aria-hidden on checkmark icon', () => {
    renderWidget(observeConfig);
    const checkmark = screen.getByText('✓');
    expect(checkmark).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows Mark as seen button in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.getByTestId('observe-acknowledge')).toHaveTextContent('Mark as seen ✓');
  });

  it('auto-completes after clicking Mark as seen in observe mode', () => {
    const { complete, emitInteraction } = renderWidget(observeConfig);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after Mark as seen', () => {
    renderWidget(observeConfig);
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
    expect(screen.getByText('Content acknowledged.')).toBeInTheDocument();
  });
});

describe('MultipleChoice edge cases', () => {
  it('renders error for empty questions array', () => {
    renderWidget({ questions: [], interactive: true });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget(undefined as unknown as Record<string, unknown>);
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('MultipleChoice accessibility', () => {
  const multiConfig = {
    questions: [{ question: 'What is 2 + 2?', options: ['3', '4', '5'], correctIndex: 1 }],
    interactive: true,
  };

  it('uses fieldset/legend for question groups', () => {
    renderWidget(multiConfig);
    const fieldset = document.querySelector('fieldset');
    expect(fieldset).toBeInTheDocument();
    const legend = document.querySelector('legend');
    expect(legend).toHaveTextContent('What is 2 + 2?');
  });

  it('uses aria-live for explanation in legacy mode', () => {
    renderWidget({
      prompt: 'Test?',
      options: [{ id: 'a', text: 'A', correct: true }],
      explanation: 'Explanation text.',
    });
    fireEvent.click(screen.getByLabelText('A'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const statusRegions = screen.getAllByRole('status');
    expect(statusRegions[1]).toHaveTextContent('Explanation text.');
  });

  it('uses aria-live for multi-question results', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    const result = screen.getByTestId('multi-result');
    expect(result.getAttribute('aria-live')).toBe('assertive');
  });

  it('uses aria-live for per-question feedback', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const feedback = screen.getByTestId('question-feedback');
    expect(feedback.getAttribute('aria-live')).toBe('assertive');
  });

  it('has aria-labels on radio options', () => {
    renderWidget(multiConfig);
    expect(screen.getByLabelText('3')).toBeInTheDocument();
    expect(screen.getByLabelText('4')).toBeInTheDocument();
    expect(screen.getByLabelText('5')).toBeInTheDocument();
  });

  it('has role="group" on container', () => {
    renderWidget(multiConfig);
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  it('uses fieldset/legend in observe mode', () => {
    const observeConfig = {
      questions: [{ question: 'What is 2 + 2?', options: ['3', '4', '5'], correctIndex: 1 }],
    };
    renderWidget(observeConfig);
    const fieldset = document.querySelector('fieldset');
    expect(fieldset).toBeInTheDocument();
    const legend = document.querySelector('legend');
    expect(legend).toHaveTextContent('What is 2 + 2?');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
