import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { storyQuestion } from './StoryQuestion';

const WidgetComponent = storyQuestion.render;

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

const sampleConfig = {
  scenario: 'Once upon a time, there was a brave knight.',
  questions: [
    {
      question: 'Who is the story about?',
      options: ['A dragon', 'A knight', 'A king'],
      correctIndex: 1,
    },
    { question: 'What was the knight?', options: ['Brave', 'Cowardly', 'Sleepy'], correctIndex: 0 },
  ],
  visual: '🛡️',
};

describe('StoryQuestion widget definition', () => {
  it('has correct widget id', () => {
    expect(storyQuestion.id).toBe('open-edu.story-question');
  });

  it('has a render function', () => {
    expect(typeof storyQuestion.render).toBe('function');
  });
});

describe('StoryQuestion observe mode', () => {
  it('renders story in an article', () => {
    renderWidget(sampleConfig);
    expect(screen.getByText('Once upon a time, there was a brave knight.')).toBeInTheDocument();
    const article = document.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('shows first question with correct answer highlighted', () => {
    renderWidget(sampleConfig);
    expect(screen.getByText('Who is the story about?')).toBeInTheDocument();
    const correctRadio = screen.getByLabelText('Correct answer: A knight');
    expect(correctRadio).toBeChecked();
    expect(correctRadio).toBeDisabled();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows visual emoji when provided', () => {
    renderWidget(sampleConfig);
    expect(screen.getByText('🛡️')).toBeInTheDocument();
  });

  it('does not show Next or Submit button in observe mode', () => {
    renderWidget(sampleConfig);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
  });

  it('completes after clicking acknowledge in observe mode', () => {
    const { complete, emitInteraction } = renderWidget(sampleConfig);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after acknowledge', () => {
    renderWidget(sampleConfig);
    fireEvent.click(screen.getByText('Acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
    expect(screen.getByText('Content acknowledged.')).toBeInTheDocument();
  });
});

describe('StoryQuestion interactive mode', () => {
  const interactiveConfig = {
    ...sampleConfig,
    interactive: true,
  };

  it('renders story in an article', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('Once upon a time, there was a brave knight.')).toBeInTheDocument();
    const article = document.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('renders first question with options', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('Who is the story about?')).toBeInTheDocument();
    expect(screen.getByLabelText('A dragon')).toBeInTheDocument();
    expect(screen.getByLabelText('A knight')).toBeInTheDocument();
    expect(screen.getByLabelText('A king')).toBeInTheDocument();
  });

  it('shows question progress for multi-question mode', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('question-progress')).toHaveTextContent('Question 1 of 2');
  });

  it('shows "Next" button for intermediate questions', () => {
    renderWidget(interactiveConfig);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Next');
  });

  it('shows "Submit" on last question', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Correct!');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('What was the knight?')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Submit');
  });

  it('Next button disabled without selection', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows per-question feedback before advancing', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Correct!');
    expect(screen.queryByText('What was the knight?')).not.toBeInTheDocument();
  });

  it('shows incorrect feedback with correct answer', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A dragon'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Incorrect');
    expect(screen.getByTestId('question-feedback')).toHaveTextContent(
      'The correct answer is: A knight',
    );
  });

  it('advances to next question after feedback Next', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Correct!');
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByText('What was the knight?')).toBeInTheDocument();
  });

  it('emits answer interaction on each question', () => {
    const { emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
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
    const { emitInteraction, complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
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
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByTestId('story-result')).toHaveTextContent('You got 2 of 2 correct.');
  });

  it('shows aggregate score on completion with some incorrect', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A dragon'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByTestId('story-result')).toHaveTextContent('You got 1 of 2 correct.');
  });

  it('computes correct percentage', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A dragon'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(complete).toHaveBeenCalledWith(50, expect.any(Object));
  });
});

describe('StoryQuestion legacy story field support', () => {
  it('normalizes legacy story field to scenario', () => {
    const legacyConfig = {
      story: 'A tale of two cities.',
      questions: [
        { question: 'How many cities?', options: ['One', 'Two', 'Three'], correctIndex: 1 },
      ],
    };
    renderWidget(legacyConfig);
    expect(screen.getByText('A tale of two cities.')).toBeInTheDocument();
  });

  it('prefers scenario over story when both provided', () => {
    const bothConfig = {
      scenario: 'Primary story.',
      story: 'Legacy story.',
      questions: [{ question: 'Which story?', options: ['Primary', 'Legacy'], correctIndex: 0 }],
    };
    renderWidget(bothConfig);
    expect(screen.getByText('Primary story.')).toBeInTheDocument();
    expect(screen.queryByText('Legacy story.')).toBeNull();
  });
});

describe('StoryQuestion result screen', () => {
  const interactiveConfig = {
    ...sampleConfig,
    interactive: true,
  };

  it('keeps story visible after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByText('Once upon a time, there was a brave knight.')).toBeInTheDocument();
  });

  it('shows all questions with their results after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByText('Question 1: Who is the story about?')).toBeInTheDocument();
    expect(screen.getByText('Question 2: What was the knight?')).toBeInTheDocument();
  });

  it('shows correct answer with checkmark in results', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows incorrect answer with cross in results', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A dragon'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    const crosses = screen.getAllByText('✗');
    expect(crosses.length).toBeGreaterThanOrEqual(1);
  });
});

describe('StoryQuestion callout styling', () => {
  it('renders story in a distinct callout box', () => {
    renderWidget({ ...sampleConfig, interactive: true });
    const callout = document.querySelector('.bg-primary-container\\/20');
    expect(callout).toBeInTheDocument();
  });

  it('renders visual at larger size in callout', () => {
    renderWidget({ ...sampleConfig, interactive: true });
    const visual = screen.getByText('🛡️');
    expect(visual).toHaveClass('text-3xl');
  });

  it('callout has left border styling', () => {
    renderWidget({ ...sampleConfig, interactive: true });
    const callout = document.querySelector('.border-l-4');
    expect(callout).toBeInTheDocument();
  });
});

describe('StoryQuestion accessibility', () => {
  const interactiveConfig = {
    ...sampleConfig,
    interactive: true,
  };

  it('renders story in an <article>', () => {
    renderWidget(interactiveConfig);
    const article = document.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('uses fieldset/legend for question groups', () => {
    renderWidget(interactiveConfig);
    const fieldset = document.querySelector('fieldset');
    expect(fieldset).toBeInTheDocument();
    const legend = document.querySelector('legend');
    expect(legend).toHaveTextContent('Who is the story about?');
  });

  it('uses aria-live for results', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    fireEvent.click(screen.getByLabelText('Brave'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByTestId('feedback-next'));
    const result = screen.getByTestId('story-result');
    expect(result.getAttribute('aria-live')).toBe('assertive');
  });

  it('uses aria-live for per-question feedback', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const feedback = screen.getByTestId('question-feedback');
    expect(feedback.getAttribute('aria-live')).toBe('assertive');
  });

  it('has aria-labels on radio options', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByLabelText('A dragon')).toBeInTheDocument();
    expect(screen.getByLabelText('A knight')).toBeInTheDocument();
    expect(screen.getByLabelText('A king')).toBeInTheDocument();
  });

  it('has aria-label on article', () => {
    renderWidget(interactiveConfig);
    const article = document.querySelector('article');
    expect(article).toHaveAttribute('aria-label', '🛡️ Story');
  });

  it('uses aria-live in observe mode results', () => {
    renderWidget(sampleConfig);
    fireEvent.click(screen.getByText('Acknowledge'));
    const completeRegion = screen.getByTestId('observe-complete');
    expect(completeRegion.getAttribute('aria-live')).toBe('assertive');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('StoryQuestion edge cases', () => {
  it('renders error for empty config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no questions', () => {
    renderWidget({ scenario: 'A story.', questions: [] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for missing scenario and story', () => {
    renderWidget({
      questions: [{ question: 'Q?', options: ['A', 'B'], correctIndex: 0 }],
    });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('handles single question in interactive mode', () => {
    const singleConfig = {
      scenario: 'A short story.',
      questions: [{ question: 'What?', options: ['A', 'B'], correctIndex: 0 }],
      interactive: true,
    };
    renderWidget(singleConfig);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Submit');
    fireEvent.click(screen.getByLabelText('A'));
    fireEvent.click(btn);
    expect(screen.getByTestId('question-feedback')).toHaveTextContent('Correct!');
    fireEvent.click(screen.getByTestId('feedback-next'));
    expect(screen.getByTestId('story-result')).toHaveTextContent('You got 1 of 1 correct.');
  });

  it('uses widgetId in interactions', () => {
    const { emitInteraction } = renderWidget({ ...sampleConfig, interactive: true });
    fireEvent.click(screen.getByLabelText('A knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.story-question' }),
    );
  });

  it('does not render visual when not provided', () => {
    const noVisualConfig = {
      scenario: 'A story.',
      questions: [{ question: 'Q?', options: ['A', 'B'], correctIndex: 0 }],
      interactive: true,
    };
    renderWidget(noVisualConfig);
    const article = document.querySelector('article');
    expect(article).toHaveAttribute('aria-label', 'Story');
  });
});
