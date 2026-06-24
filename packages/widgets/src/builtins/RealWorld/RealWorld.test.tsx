import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders scenario in an article', () => {
    renderWidget(sampleConfig);
    expect(screen.getByText('You are a scientist studying climate change.')).toBeInTheDocument();
    const article = document.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('shows task description', () => {
    renderWidget(sampleConfig);
    expect(screen.getByText('Describe one way climate change affects the environment.')).toBeInTheDocument();
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

  it('does not show complete button in observe mode', () => {
    renderWidget(sampleConfig);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('auto-completes after 1500ms in observe mode', () => {
    const { complete, emitInteraction } = renderWidget(sampleConfig);
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
    renderWidget(sampleConfig);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
    expect(screen.getByText('Completed.')).toBeInTheDocument();
  });

  it('does not auto-complete if already submitted', () => {
    const { complete } = renderWidget(sampleConfig);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(complete).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(complete).toHaveBeenCalledTimes(1);
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
    fireEvent.change(textarea, { target: { value: 'Rising sea levels are affecting coastal communities.' } });
    expect(textarea.value).toBe('Rising sea levels are affecting coastal communities.');
  });

  it('emits submit interaction with response on complete', () => {
    const { emitInteraction, complete } = renderWidget(interactiveConfig);
    const textarea = screen.getByTestId('response-textarea');
    fireEvent.change(textarea, { target: { value: 'More frequent storms.' } });
    fireEvent.click(screen.getByTestId('complete-task-button'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'submit',
        response: 'More frequent storms.',
        correct: true,
      }),
    );
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('shows completed state after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    expect(screen.getByTestId('real-world-result')).toBeInTheDocument();
    expect(screen.getByText('Task completed.')).toBeInTheDocument();
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
    const emittedData = emitInteraction.mock.calls[0][0];
    expect(emittedData.expectedAnswer).toBeUndefined();
    expect(emittedData.responseExactMatch).toBeUndefined();
  });

  it('does not auto-complete in interactive mode', () => {
    vi.useFakeTimers();
    const { complete } = renderWidget(interactiveConfig);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(complete).not.toHaveBeenCalled();
    vi.useRealTimers();
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

  it('has label associated with textarea', () => {
    renderWidget(interactiveConfig);
    const textarea = screen.getByTestId('response-textarea');
    const label = screen.getByTestId('response-label');
    expect(label).toHaveAttribute('for', 'real-world-response');
    expect(textarea).toHaveAttribute('id', 'real-world-response');
  });

  it('uses aria-live for results', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('complete-task-button'));
    const result = screen.getByTestId('real-world-result');
    expect(result.getAttribute('aria-live')).toBe('assertive');
  });

  it('uses aria-live in observe mode results', () => {
    vi.useFakeTimers();
    renderWidget(sampleConfig);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    const completeRegion = screen.getByTestId('observe-complete');
    expect(completeRegion.getAttribute('aria-live')).toBe('assertive');
    vi.useRealTimers();
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

  it('uses prompt as label for textarea when prompt is set', () => {
    renderWidget({
      scenario: 'A scenario.',
      prompt: 'What do you think?',
      interactive: true,
    });
    expect(screen.getByTestId('response-label')).toHaveTextContent('What do you think?');
  });

  it('falls back to default label when prompt is not provided', () => {
    renderWidget({
      scenario: 'A scenario.',
      interactive: true,
    });
    expect(screen.getByTestId('response-label')).toHaveTextContent('Your response:');
  });

  it('submits with empty response', () => {
    const { complete } = renderWidget({
      scenario: 'A scenario.',
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('complete-task-button'));
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('uses widgetId in interactions', () => {
    const { emitInteraction } = renderWidget({
      scenario: 'Test.',
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('complete-task-button'));
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
