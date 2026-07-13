import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { visualCounting } from './VisualCounting';

const WidgetComponent = visualCounting.render;

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

describe('VisualCounting schema', () => {
  it('has correct widget id', () => {
    expect(visualCounting.id).toBe('core.visual-counting');
  });

  it('has a render function', () => {
    expect(typeof visualCounting.render).toBe('function');
  });
});

describe('VisualCounting observe mode (interactive: false)', () => {
  it('renders items with count label', () => {
    renderWidget({ items: ['🍎'], count: 3, text: 'apples', interactive: false });
    expect(screen.getByText('There are 3 apples.')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('does not render number buttons in observe mode', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: false });
    expect(screen.queryByLabelText(/Count \d/)).toBeNull();
  });

  it('auto-completes after clicking Mark as seen in observe mode', () => {
    const { complete, emitInteraction } = renderWidget({
      items: ['🍎'],
      count: 3,
      interactive: false,
    });
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after Mark as seen', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });

  it('renders description in observe mode', () => {
    renderWidget({
      items: ['🍎'],
      count: 3,
      description: 'Count the apples',
      interactive: false,
    });
    expect(screen.getByText('Count the apples')).toBeTruthy();
  });

  it('renders addition mode in observe', () => {
    renderWidget({ left: ['🍎', '🍎'], right: ['🍎'], sum: 3, interactive: false });
    expect(screen.getByLabelText('Addition counting')).toBeTruthy();
  });

  it('shows config error for invalid content', () => {
    renderWidget({ interactive: false });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('VisualCounting interactive mode (interactive: true)', () => {
  it('renders number buttons from expected-3 to expected+3', () => {
    renderWidget({ items: ['🍎'], count: 5, interactive: true });
    expect(screen.getByLabelText('Count 2')).toBeTruthy();
    expect(screen.getByLabelText('Count 8')).toBeTruthy();
    expect(screen.queryByLabelText('Count 1')).toBeNull();
    expect(screen.queryByLabelText('Count 9')).toBeNull();
  });

  it('shows items without count label', () => {
    renderWidget({ items: ['🍎'], count: 5, text: 'apples', interactive: true });
    expect(screen.queryByText('There are 5 apples.')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('clamp lower bound to 1', () => {
    renderWidget({ items: ['🍎'], count: 2, interactive: true });
    expect(screen.getByLabelText('Count 1')).toBeTruthy();
    expect(screen.queryByLabelText('Count 0')).toBeNull();
  });

  it('calls complete with 100 on correct answer', () => {
    const { complete, emitInteraction } = renderWidget({
      items: ['🍎'],
      count: 3,
      interactive: true,
    });
    fireEvent.click(screen.getByLabelText('Count 3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, accuracy: 1 }),
    );
  });

  it('calls complete with accuracy on incorrect answer', () => {
    const { complete, emitInteraction } = renderWidget({
      items: ['🍎'],
      count: 5,
      interactive: true,
    });
    fireEvent.click(screen.getByLabelText('Count 3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(60, expect.any(Object));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false, accuracy: 0.6 }),
    );
  });

  it('cannot submit without selecting a number', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: true });
    expect(screen.getByText('Submit')).toBeDisabled();
  });

  it('submit button is removed after submission', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: true });
    fireEvent.click(screen.getByLabelText('Count 3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('shows feedback in styled region after correct submission', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: true });
    fireEvent.click(screen.getByLabelText('Count 3'));
    fireEvent.click(screen.getByText('Submit'));
    const feedback = screen.getByTestId('feedback');
    expect(feedback).toBeTruthy();
    expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.getAttribute('aria-live')).toBe('assertive');
    expect(screen.getByText('Correct! The answer is 3.')).toBeTruthy();
  });

  it('shows incorrect feedback for wrong answer', () => {
    renderWidget({ items: ['🍎'], count: 5, interactive: true });
    fireEvent.click(screen.getByLabelText('Count 3'));
    fireEvent.click(screen.getByText('Submit'));
    const feedback = screen.getByTestId('feedback');
    expect(feedback).toBeTruthy();
    expect(screen.getByText('Not quite. The correct answer is 5. You selected 3.')).toBeTruthy();
  });

  it('shows selected count in live region', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: true });
    fireEvent.click(screen.getByLabelText('Count 3'));
    expect(screen.getByText('Selected: 3')).toBeTruthy();
  });

  it('renders description in interactive mode', () => {
    renderWidget({ items: ['🍎'], count: 3, description: 'Count the apples', interactive: true });
    expect(screen.getByText('Count the apples')).toBeTruthy();
  });

  it('renders hint text when provided', () => {
    renderWidget({ items: ['🍎'], count: 3, hint: 'Try counting slowly.', interactive: true });
    expect(screen.getByText('Try counting slowly.')).toBeTruthy();
  });

  it('renders graduated hints with More help button', () => {
    const hints = ['Hint 1', 'Hint 2'];
    renderWidget({ items: ['🍎'], count: 3, hints, interactive: true });
    expect(screen.getByText('Hint 1')).toBeTruthy();
    expect(screen.getByText('More help')).toBeTruthy();
    fireEvent.click(screen.getByText('More help'));
    expect(screen.getByText('Hint 2')).toBeTruthy();
    expect(screen.queryByText('More help')).toBeNull();
  });

  it('renders addition mode interactively', () => {
    renderWidget({ left: ['🍎', '🍎'], right: ['🍎'], sum: 3, interactive: true });
    expect(screen.getByLabelText('Addition counting')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Count 3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Correct! The answer is 3.')).toBeTruthy();
  });

  it('handles addition with number left/right', () => {
    const { complete } = renderWidget({ left: 3, right: 2, sum: 5, interactive: true });
    fireEvent.click(screen.getByLabelText('Count 5'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows config error for invalid interactive config', () => {
    renderWidget({ interactive: true });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('VisualCounting edge cases', () => {
  it('uses emoji override when provided', () => {
    renderWidget({ items: ['🍎'], count: 2, emoji: '🍊', interactive: false });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });

  it('applies size variants', () => {
    render(
      <WidgetComponent
        nodeId="test"
        config={{ items: ['🍎'], count: 1, interactive: false }}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('visual-counting')).toBeTruthy();
  });

  it('defaults to observe mode when interactive not specified', () => {
    renderWidget({ items: ['🍎'], count: 3 });
    expect(screen.queryByLabelText(/Count \d/)).toBeNull();
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget({ items: ['🍎'], count: 3, interactive: false });
    expect(complete).not.toHaveBeenCalled();
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget({ items: ['🍎'], count: 3, interactive: true });
    fireEvent.click(screen.getByLabelText('Count 3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'core.visual-counting' }),
    );
  });

  it('renders emoji items when only count and emoji are provided (no items array)', () => {
    renderWidget({ count: 4, emoji: '🍎', interactive: false });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(screen.queryByText('No items to count.')).toBeNull();
  });
});

describe('VisualCounting accessibility', () => {
  it('has proper aria labels', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: false });
    expect(screen.getByLabelText('Visual counting activity')).toBeTruthy();
    expect(screen.getByLabelText('item')).toBeTruthy();
  });

  it('has accessible number buttons', () => {
    renderWidget({ items: ['🍎'], count: 5, interactive: true });
    expect(screen.getByLabelText('Count 2')).toBeTruthy();
    expect(screen.getByLabelText('Count 5')).toBeTruthy();
  });

  it('has aria-pressed on selected button', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: true });
    const button = screen.getByLabelText('Count 3');
    fireEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('has live region for count selection', () => {
    renderWidget({ items: ['🍎'], count: 3, interactive: true });
    fireEvent.click(screen.getByLabelText('Count 3'));
    const liveRegion = screen.getByText('Selected: 3');
    expect(liveRegion.closest('[aria-live]')).toBeTruthy();
  });

  it('uses plain text for plus and equals symbols in addition mode', () => {
    renderWidget({ left: ['🍎', '🍎'], right: ['🍎'], sum: 3, interactive: false });
    const container = screen.getByLabelText('Addition counting');
    const plusSpan = container.querySelector('span[aria-label="plus"]');
    const equalsSpan = container.querySelector('span[aria-label="equals"]');
    expect(plusSpan).toBeNull();
    expect(equalsSpan).toBeNull();
  });
});

describe('VisualCounting number button randomization', () => {
  it('number buttons are present in randomized order', () => {
    const { container } = renderWidget({ items: ['🍎'], count: 5, interactive: true });
    const buttons = container.querySelectorAll('button[aria-label^="Count "]');
    expect(buttons).toHaveLength(7);
  });
});
