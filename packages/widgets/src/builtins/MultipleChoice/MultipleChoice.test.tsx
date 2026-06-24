import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
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
    expect(multipleChoice.id).toBe('open-edu.multiple-choice');
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
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('completes with score 0 on incorrect answer', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
    expect(complete).toHaveBeenCalledWith(0);
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

  it('shows "Next" button for intermediate questions', () => {
    renderWidget(multiConfig);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Next');
  });

  it('shows "Submit" on last question', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('What is 3 * 3?')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Submit');
  });

  it('Next button disabled without selection', () => {
    renderWidget(multiConfig);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('advances to next question on correct answer', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
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
    fireEvent.click(screen.getByLabelText('9'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(emitInteraction).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'submit',
        correctCount: 2,
        totalQuestions: 2,
        accuracy: 1,
      }),
    );
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('shows aggregate score on completion with all correct', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByLabelText('9'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByTestId('multi-result')).toHaveTextContent('You got 2 of 2 correct.');
  });

  it('shows aggregate score on completion with some incorrect', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByLabelText('9'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
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
    expect(screen.getByTestId('multi-result')).toHaveTextContent('You got 1 of 1 correct.');
  });

  it('uses widgetId in interactions', () => {
    const { emitInteraction } = renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.multiple-choice' }),
    );
  });
});

describe('MultipleChoice multi-question observe mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const observeConfig = {
    questions: [
      { question: 'What is 2 + 2?', options: ['3', '4', '5'], correctIndex: 1 },
      { question: 'What is 3 * 3?', options: ['6', '9', '12'], correctIndex: 1 },
    ],
  };

  it('shows first question with correct answer highlighted', () => {
    renderWidget(observeConfig);
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    const correctRadio = screen.getByLabelText('4');
    expect(correctRadio).toBeChecked();
    expect(correctRadio).toBeDisabled();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('does not show Next or Submit button in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('auto-completes after 1500ms in observe mode', () => {
    const { complete, emitInteraction } = renderWidget(observeConfig);
    expect(complete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after auto-complete', () => {
    renderWidget(observeConfig);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
    expect(screen.getByText('Completed.')).toBeInTheDocument();
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
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveTextContent('Explanation text.');
  });

  it('uses aria-live for multi-question results', () => {
    renderWidget(multiConfig);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const result = screen.getByTestId('multi-result');
    expect(result.getAttribute('aria-live')).toBe('assertive');
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
