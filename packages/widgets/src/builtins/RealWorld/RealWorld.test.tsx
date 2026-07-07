import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { realWorld } from './RealWorld';

const WidgetComponent = realWorld.render;

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
  scenario: 'You are a scientist studying climate change.',
  taskDescription: 'Describe one way climate change affects the environment.',
  prompt: 'What impact have you observed?',
  visualExample: '🌍',
};

describe('RealWorld widget definition', () => {
  it('has correct widget id', () => {
    expect(realWorld.id).toBe('open-edu.real-world');
  });

  it('has a render function', () => {
    expect(typeof realWorld.render).toBe('function');
  });
});

describe('RealWorld observe mode', () => {
  it('renders scenario in an article', () => {
    renderWidget(sampleConfig);
    expect(screen.getByText('You are a scientist studying climate change.')).toBeInTheDocument();
    const article = document.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('shows task description', () => {
    renderWidget(sampleConfig);
    expect(
      screen.getByText('Describe one way climate change affects the environment.'),
    ).toBeInTheDocument();
  });

  it('shows prompt', () => {
    renderWidget(sampleConfig);
    expect(screen.getByText('What impact have you observed?')).toBeInTheDocument();
  });

  it('shows visual example when provided', () => {
    renderWidget(sampleConfig);
    expect(screen.getByText('🌍')).toBeInTheDocument();
  });

  it('does not show textarea in observe mode', () => {
    renderWidget(sampleConfig);
    expect(screen.queryByTestId('response-textarea')).toBeNull();
  });

  it('does not show interactive complete button in observe mode', () => {
    renderWidget(sampleConfig);
    expect(screen.queryByTestId('complete-task-button')).toBeNull();
  });

  it('completes after clicking acknowledge in observe mode', () => {
    const { complete, emitInteraction } = renderWidget(sampleConfig);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('acknowledge-button'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after acknowledge', () => {
    renderWidget(sampleConfig);
    fireEvent.click(screen.getByTestId('acknowledge-button'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
    expect(screen.getByText('Content acknowledged.')).toBeInTheDocument();
  });

  it('hides acknowledge button after first click', () => {
    renderWidget(sampleConfig);
    expect(screen.getByTestId('acknowledge-button')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('acknowledge-button'));
    expect(screen.queryByTestId('acknowledge-button')).toBeNull();
    expect(screen.getByTestId('observe-complete')).toBeInTheDocument();
  });
});

describe('RealWorld interactive mode', () => {
  const interactiveConfig = {
    ...sampleConfig,
    interactive: true,
  };

  it('renders scenario in an article', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('You are a scientist studying climate change.')).toBeInTheDocument();
    const article = document.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('shows task description', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('task-description')).toHaveTextContent(
      'Describe one way climate change affects the environment.',
    );
  });

  it('shows prompt', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('prompt')).toHaveTextContent('What impact have you observed?');
  });

  it('shows textarea for response', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('response-textarea')).toBeInTheDocument();
  });

  it('shows complete task button', () => {
    renderWidget(interactiveConfig);
    const btn = screen.getByTestId('complete-task-button');
    expect(btn).toHaveTextContent('I Completed This Task');
  });

  it('allows typing in the textarea', () => {
    renderWidget(interactiveConfig);
    const textarea = screen.getByTestId('response-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: 'Rising sea levels are affecting coastal communities.' },
    });
    expect(textarea.value).toBe('Rising sea levels are affecting coastal communities.');
  });

  it('emits submit interaction with response on complete', () => {
    const { emitInteraction, complete } = renderWidget(interactiveConfig);
    const textarea = screen.getByTestId('response-textarea');
    fireEvent.change(textarea, { target: { value: 'More frequent storms.' } });
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'submit',
        response: 'More frequent storms.',
        selfAssessment: 'well',
        score: 100,
      }),
    );
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows completed state after self-assessment', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    expect(screen.getByTestId('self-assessment-container')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(screen.getByTestId('real-world-result')).toBeInTheDocument();
    expect(screen.getByText('Your response:')).toBeInTheDocument();
  });

  it('echoes learner response after submission', () => {
    renderWidget(interactiveConfig);
    const textarea = screen.getByTestId('response-textarea');
    fireEvent.change(textarea, { target: { value: 'My test response.' } });
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(screen.getByTestId('real-world-result')).toBeInTheDocument();
    expect(screen.getByText('My test response.')).toBeInTheDocument();
  });

  it('includes expectedAnswer comparison in interaction', () => {
    const configWithAnswer = {
      ...interactiveConfig,
      expectedAnswer: 'rising sea levels',
    };
    const { emitInteraction } = renderWidget(configWithAnswer);
    const textarea = screen.getByTestId('response-textarea');
    fireEvent.change(textarea, { target: { value: 'Rising sea levels' } });
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedAnswer: 'rising sea levels',
        responseExactMatch: true,
      }),
    );
  });

  it('handles expectedAnswer mismatch', () => {
    const configWithAnswer = {
      ...interactiveConfig,
      expectedAnswer: 'rising sea levels',
    };
    const { emitInteraction } = renderWidget(configWithAnswer);
    const textarea = screen.getByTestId('response-textarea');
    fireEvent.change(textarea, { target: { value: 'Deforestation' } });
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedAnswer: 'rising sea levels',
        responseExactMatch: false,
      }),
    );
  });

  it('does not include expectedAnswer comparison if not provided', () => {
    const { emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    const emittedData = emitInteraction.mock.calls[0][0];
    expect(emittedData.expectedAnswer).toBeUndefined();
    expect(emittedData.responseExactMatch).toBeUndefined();
  });
});

describe('RealWorld self-assessment', () => {
  const interactiveConfig = {
    scenario: 'Test scenario.',
    prompt: 'What do you think?',
    interactive: true,
  };

  it('shows self-assessment buttons after clicking complete', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    expect(screen.getByTestId('self-assessment-container')).toBeInTheDocument();
    expect(screen.getByTestId('self-assess-well')).toBeInTheDocument();
    expect(screen.getByTestId('self-assess-learning')).toBeInTheDocument();
    expect(screen.getByTestId('self-assess-practice')).toBeInTheDocument();
  });

  it('scores 100 for "I understand this well"', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('scores 50 for "I\'m still learning"', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-learning'));
    expect(complete).toHaveBeenCalledWith(50, expect.any(Object));
  });

  it('scores 0 for "I need more practice"', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-practice'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('emits self-assessment in interaction data', () => {
    const { emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-learning'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        selfAssessment: 'learning',
        score: 50,
      }),
    );
  });

  it('shows self-assessment result after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(screen.getByText(/Self-assessment:.*I understand this well/)).toBeInTheDocument();
  });
});

describe('RealWorld hint', () => {
  const hintConfig = {
    scenario: 'Test scenario.',
    prompt: 'What do you think?',
    hint: 'Think about the water cycle.',
    interactive: true,
  };

  it('shows hint in interactive mode', () => {
    renderWidget(hintConfig);
    expect(screen.getByTestId('hint')).toHaveTextContent('Think about the water cycle.');
  });

  it('does not show hint in observe mode', () => {
    renderWidget({ scenario: 'Test scenario.', hint: 'A hint.' });
    expect(screen.queryByTestId('hint')).toBeNull();
  });

  it('textarea references hint via aria-describedby', () => {
    renderWidget(hintConfig);
    const textarea = screen.getByTestId('response-textarea');
    expect(textarea).toHaveAttribute('aria-describedby');
  });
});

describe('RealWorld accessibility', () => {
  const interactiveConfig = {
    ...sampleConfig,
    interactive: true,
  };

  it('renders scenario in an <article>', () => {
    renderWidget(interactiveConfig);
    const article = document.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('has aria-label on article', () => {
    renderWidget(interactiveConfig);
    const article = document.querySelector('article');
    expect(article).toHaveAttribute('aria-label', 'Real World Scenario');
  });

  it('has aria-label on textarea instead of visible label', () => {
    renderWidget(interactiveConfig);
    const textarea = screen.getByTestId('response-textarea');
    expect(textarea).toHaveAttribute('aria-label', 'What impact have you observed?');
    expect(screen.queryByTestId('response-label')).toBeNull();
  });

  it('uses aria-live for results', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    const result = screen.getByTestId('real-world-result');
    expect(result.getAttribute('aria-live')).toBe('assertive');
  });

  it('uses aria-live in observe mode results', () => {
    renderWidget(sampleConfig);
    fireEvent.click(screen.getByTestId('acknowledge-button'));
    const completeRegion = screen.getByTestId('observe-complete');
    expect(completeRegion.getAttribute('aria-live')).toBe('assertive');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('RealWorld edge cases', () => {
  it('renders error for empty config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for missing scenario', () => {
    renderWidget({ prompt: 'What?' });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders with only scenario required field', () => {
    renderWidget({ scenario: 'A scenario.' });
    expect(screen.getByText('A scenario.')).toBeInTheDocument();
  });

  it('uses prompt as aria-label for textarea when prompt is set', () => {
    renderWidget({
      scenario: 'A scenario.',
      prompt: 'What do you think?',
      interactive: true,
    });
    const textarea = screen.getByTestId('response-textarea');
    expect(textarea).toHaveAttribute('aria-label', 'What do you think?');
  });

  it('falls back to default aria-label when prompt is not provided', () => {
    renderWidget({
      scenario: 'A scenario.',
      interactive: true,
    });
    const textarea = screen.getByTestId('response-textarea');
    expect(textarea).toHaveAttribute('aria-label', 'Your response');
  });

  it('submits with empty response after self-assessment', () => {
    const { complete } = renderWidget({
      scenario: 'A scenario.',
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('uses widgetId in interactions', () => {
    const { emitInteraction } = renderWidget({
      scenario: 'Test.',
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('complete-task-button'));
    fireEvent.click(screen.getByTestId('self-assess-well'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.real-world' }),
    );
  });

  it('does not render visual example when not provided', () => {
    renderWidget({
      scenario: 'No visual.',
      interactive: true,
    });
    const article = document.querySelector('article');
    expect(article).toHaveAttribute('aria-label', 'Real World Scenario');
  });
});
