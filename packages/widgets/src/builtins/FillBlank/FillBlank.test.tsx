import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { fillBlank } from './FillBlank';

const WidgetComponent = fillBlank.render;

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

const selectConfig = {
  template: 'The capital of France is ___. It is known for the ___.',
  blanks: [
    { id: 'city', position: 0, correctAnswer: 'Paris', options: ['Paris', 'London', 'Berlin'] },
    {
      id: 'landmark',
      position: 1,
      correctAnswer: 'Eiffel Tower',
      options: ['Louvre', 'Eiffel Tower', 'Notre Dame'],
    },
  ],
  mode: 'select' as const,
  interactive: true,
};

const typeConfig = {
  template: 'The capital of France is ___.',
  blanks: [{ id: 'b1', position: 0, correctAnswer: 'Paris' }],
  mode: 'type' as const,
  interactive: true,
};

describe('FillBlank widget definition', () => {
  it('has correct widget id', () => {
    expect(fillBlank.id).toBe('open-edu.fill-blank');
  });

  it('has a render function', () => {
    expect(typeof fillBlank.render).toBe('function');
  });
});

describe('FillBlank observe mode', () => {
  const observeConfig = {
    template: 'The capital of France is ___. It is known for the ___.',
    blanks: [
      { id: 'city', position: 0, correctAnswer: 'Paris', options: ['Paris', 'London', 'Berlin'] },
      {
        id: 'landmark',
        position: 1,
        correctAnswer: 'Eiffel Tower',
        options: ['Louvre', 'Eiffel Tower', 'Notre Dame'],
      },
    ],
    mode: 'select',
  };

  it('renders template with correct answers filled in', () => {
    renderWidget(observeConfig);
    expect(screen.getByText(/The capital of France is/)).toBeInTheDocument();
    expect(screen.getByText(/It is known for the/)).toBeInTheDocument();
    expect(screen.getByTestId('observe-blank-city')).toHaveTextContent('Paris');
    expect(screen.getByTestId('observe-blank-landmark')).toHaveTextContent('Eiffel Tower');
  });

  it('does not show interactive controls in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.queryByTestId(/^blank-select-/)).toBeNull();
    expect(screen.queryByTestId(/^blank-input-/)).toBeNull();
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

  it('renders description in observe mode', () => {
    renderWidget({ ...observeConfig, description: 'Geography questions' });
    expect(screen.getByText('Geography questions')).toBeInTheDocument();
  });
});

describe('FillBlank interactive select mode', () => {
  it('renders template segments', () => {
    renderWidget(selectConfig);
    expect(screen.getByText(/The capital of France is/)).toBeInTheDocument();
    expect(screen.getByText(/It is known for the/)).toBeInTheDocument();
  });

  it('renders select buttons for each blank', () => {
    renderWidget(selectConfig);
    expect(screen.getByTestId('blank-select-city')).toBeInTheDocument();
    expect(screen.getByTestId('blank-select-landmark')).toBeInTheDocument();
  });

  it('shows question mark placeholder initially', () => {
    renderWidget(selectConfig);
    const btn = screen.getByTestId('blank-select-city');
    expect(btn).toHaveTextContent('?');
  });

  it('opens dropdown when select button clicked', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    expect(screen.getByTestId('dropdown-city')).toBeInTheDocument();
    expect(screen.getByTestId('option-city-0')).toHaveTextContent('Paris');
    expect(screen.getByTestId('option-city-1')).toHaveTextContent('London');
    expect(screen.getByTestId('option-city-2')).toHaveTextContent('Berlin');
  });

  it('closes dropdown when same button clicked again', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    expect(screen.getByTestId('dropdown-city')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('blank-select-city'));
    expect(screen.queryByTestId('dropdown-city')).toBeNull();
  });

  it('selects option when clicked in dropdown', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    expect(screen.getByTestId('blank-select-city')).toHaveTextContent('Paris');
    expect(screen.queryByTestId('dropdown-city')).toBeNull();
  });

  it('closes first dropdown when opening another', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    expect(screen.getByTestId('dropdown-city')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    expect(screen.queryByTestId('dropdown-city')).toBeNull();
    expect(screen.getByTestId('dropdown-landmark')).toBeInTheDocument();
  });

  it('submit disabled until all blanks answered', () => {
    renderWidget(selectConfig);
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('calls complete with 100 on all correct', () => {
    const { complete, emitInteraction } = renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, accuracy: 1 }),
    );
  });

  it('calls complete with partial score', () => {
    const { complete } = renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-1'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(50, expect.any(Object));
  });

  it('calls complete with 0 on all wrong', () => {
    const { complete } = renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-2'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-0'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('shows green border on correct answer after submission', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    const cityBtn = screen.getByTestId('blank-select-city');
    expect(cityBtn.style.border).toContain('oe-color-success');
    const landmarkBtn = screen.getByTestId('blank-select-landmark');
    expect(landmarkBtn.style.border).toContain('oe-color-success');
  });

  it('shows red border on incorrect answer after submission', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-1'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    const cityBtn = screen.getByTestId('blank-select-city');
    expect(cityBtn.style.border).toContain('oe-color-error');
  });

  it('shows feedback after submission', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeInTheDocument();
  });

  it('shows correct feedback when all correct', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Correct! All blanks filled correctly.')).toBeInTheDocument();
  });

  it('shows partial feedback when some incorrect', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-1'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('1 of 2 blanks correct.')).toBeInTheDocument();
  });

  it('result button shows Correct after all correct', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('result-display')).toHaveTextContent('Correct!');
  });

  it('result button shows Incorrect after any wrong', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-1'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('result-display')).toHaveTextContent('Incorrect');
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.fill-blank' }),
    );
  });

  it('emits answers and score in submit interaction', () => {
    const { emitInteraction } = renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        answers: { city: 'Paris', landmark: 'Eiffel Tower' },
        correctCount: 2,
        totalBlanks: 2,
      }),
    );
  });

  it('shows description in interactive mode', () => {
    renderWidget({ ...selectConfig, description: 'Geography quiz' });
    expect(screen.getByText('Geography quiz')).toBeInTheDocument();
  });
});

describe('FillBlank interactive type mode', () => {
  it('renders input fields for each blank', () => {
    renderWidget(typeConfig);
    expect(screen.getByTestId('blank-input-b1')).toBeInTheDocument();
  });

  it('allows typing in input fields', () => {
    renderWidget(typeConfig);
    const input = screen.getByTestId('blank-input-b1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Paris' } });
    expect(input.value).toBe('Paris');
  });

  it('submit disabled when blank empty', () => {
    renderWidget(typeConfig);
    expect(screen.getByText('Submit')).toBeDisabled();
  });

  it('submit enabled when blank filled', () => {
    renderWidget(typeConfig);
    const input = screen.getByTestId('blank-input-b1');
    fireEvent.change(input, { target: { value: 'Paris' } });
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('calls complete with 100 on correct answer', () => {
    const { complete } = renderWidget(typeConfig);
    const input = screen.getByTestId('blank-input-b1');
    fireEvent.change(input, { target: { value: 'Paris' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('calls complete with 0 on incorrect answer', () => {
    const { complete } = renderWidget(typeConfig);
    const input = screen.getByTestId('blank-input-b1');
    fireEvent.change(input, { target: { value: 'London' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('shows green border on correct answer', () => {
    renderWidget(typeConfig);
    const input = screen.getByTestId('blank-input-b1');
    fireEvent.change(input, { target: { value: 'Paris' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(input.style.border).toContain('oe-color-success');
  });

  it('shows red border on incorrect answer', () => {
    renderWidget(typeConfig);
    const input = screen.getByTestId('blank-input-b1');
    fireEvent.change(input, { target: { value: 'London' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(input.style.border).toContain('oe-color-error');
  });

  it('disables input after submission', () => {
    renderWidget(typeConfig);
    const input = screen.getByTestId('blank-input-b1');
    fireEvent.change(input, { target: { value: 'Paris' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(input).toBeDisabled();
  });

  it('shows feedback after submission', () => {
    renderWidget(typeConfig);
    const input = screen.getByTestId('blank-input-b1');
    fireEvent.change(input, { target: { value: 'Paris' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeInTheDocument();
  });

  it('handles numeric answers', () => {
    const numericConfig = {
      template: '2 + 2 = ___.',
      blanks: [{ id: 'n1', position: 0, correctAnswer: 4 }],
      mode: 'type' as const,
      interactive: true,
    };
    renderWidget(numericConfig);
    const input = screen.getByTestId('blank-input-n1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Correct! All blanks filled correctly.')).toBeInTheDocument();
  });
});

describe('FillBlank pipeline variant', () => {
  const pipelineConfig = {
    prompt: 'Geography questions',
    statement: 'The capital of France is ___.',
    answers: ['Paris'],
    mode: 'type' as const,
    interactive: true,
  };

  it('renders from pipeline config', () => {
    renderWidget(pipelineConfig);
    expect(screen.getByText(/The capital of France is/)).toBeInTheDocument();
    expect(screen.getByTestId('blank-input-blank-0')).toBeInTheDocument();
  });

  it('accepts correct answer from pipeline config', () => {
    const { complete } = renderWidget(pipelineConfig);
    const input = screen.getByTestId('blank-input-blank-0');
    fireEvent.change(input, { target: { value: 'Paris' } });
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('uses description from prompt in pipeline mode', () => {
    renderWidget(pipelineConfig);
    expect(screen.getByText('Geography questions')).toBeInTheDocument();
  });
});

describe('FillBlank hints', () => {
  const hintSelectConfig = {
    ...selectConfig,
    hints: ['Think of famous landmarks.', 'It starts with P.'],
  };

  it('renders first hint when provided', () => {
    renderWidget(hintSelectConfig);
    expect(screen.getByText('Think of famous landmarks.')).toBeInTheDocument();
  });

  it('shows More help button for multiple hints', () => {
    renderWidget(hintSelectConfig);
    expect(screen.getByText('More help')).toBeInTheDocument();
  });

  it('advances to next hint on More help click', () => {
    renderWidget(hintSelectConfig);
    fireEvent.click(screen.getByText('More help'));
    expect(screen.getByText('It starts with P.')).toBeInTheDocument();
    expect(screen.queryByText('More help')).toBeNull();
  });

  it('renders single hint text when hints array not present', () => {
    renderWidget({ ...selectConfig, hint: 'A single hint.', hints: undefined });
    expect(screen.getByText('A single hint.')).toBeInTheDocument();
  });

  it('does not render hints after submission', () => {
    renderWidget(hintSelectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Think of famous landmarks.')).toBeNull();
  });
});

describe('FillBlank edge cases', () => {
  it('renders error for empty config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for invalid config', () => {
    renderWidget({ template: 'test', blanks: [] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget(undefined as unknown as Record<string, unknown>);
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('defaults to select mode when mode not specified', () => {
    const config = {
      template: 'The capital is ___.',
      blanks: [{ id: 'c1', position: 0, correctAnswer: 'Paris', options: ['Paris', 'London'] }],
      interactive: true,
    };
    renderWidget(config);
    expect(screen.getByTestId('blank-select-c1')).toBeInTheDocument();
  });

  it('defaults to observe mode when interactive not set', () => {
    const config = {
      template: 'The capital is ___.',
      blanks: [{ id: 'c1', position: 0, correctAnswer: 'Paris', options: ['Paris', 'London'] }],
      mode: 'select',
    };
    renderWidget(config);
    expect(screen.queryByTestId('blank-select-c1')).toBeNull();
    expect(screen.getByTestId('observe-blank-c1')).toBeInTheDocument();
  });
});

describe('FillBlank accessibility', () => {
  it('has aria-label on root element', () => {
    renderWidget(selectConfig);
    expect(screen.getByLabelText('Fill in the blank activity')).toBeInTheDocument();
  });

  it('has role="group" on content area', () => {
    renderWidget(selectConfig);
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  it('has aria-live region for feedback', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    fireEvent.click(screen.getByTestId('option-city-0'));
    fireEvent.click(screen.getByTestId('blank-select-landmark'));
    fireEvent.click(screen.getByTestId('option-landmark-1'));
    fireEvent.click(screen.getByText('Submit'));
    const feedback = screen.getByTestId('feedback');
    expect(feedback.getAttribute('aria-live')).toBe('assertive');
  });

  it('has aria-label on select buttons', () => {
    renderWidget(selectConfig);
    expect(screen.getByLabelText('Blank 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Blank 2')).toBeInTheDocument();
  });

  it('has aria-label on type inputs', () => {
    renderWidget(typeConfig);
    expect(screen.getByLabelText('Blank 1')).toBeInTheDocument();
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has role="listbox" on dropdown', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('has role="option" on dropdown items', () => {
    renderWidget(selectConfig);
    fireEvent.click(screen.getByTestId('blank-select-city'));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('has combobox role on select buttons', () => {
    renderWidget(selectConfig);
    expect(screen.getByRole('combobox', { name: 'Blank 1' })).toBeInTheDocument();
  });

  it('has aria-expanded on select buttons', () => {
    renderWidget(selectConfig);
    const btn = screen.getByTestId('blank-select-city');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('has status role for observe mode', () => {
    renderWidget({
      template: 'Test ___.',
      blanks: [{ id: 't1', position: 0, correctAnswer: 'ok' }],
      mode: 'select',
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
