import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VisualCountingWidget, { visualCounting } from './VisualCounting';

describe('VisualCounting', () => {
  const WidgetComponent = VisualCountingWidget.render;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseConfig = {
    items: ['🍎', '🍎', '🍎'],
    count: 3,
    text: 'apples',
  };

  function advanceObserve() {
    act(() => {
      vi.advanceTimersByTime(1500);
    });
  }

  it('renders observe phase with items and label', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    expect(screen.getByTestId('visual-counting')).toBeInTheDocument();
    expect(screen.getByText('There are 3 apples.')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('auto-completes observe phase after 1500ms', () => {
    const emitInteraction = vi.fn();
    const complete = vi.fn();

    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={emitInteraction}
        complete={complete}
      />,
    );

    advanceObserve();

    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true }),
    );
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('transitions to interactive phase after observe', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();

    expect(screen.getByText('Submit')).toBeInTheDocument();
    expect(screen.getByLabelText('Count 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Count 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Count 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Count 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Count 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Count 6')).toBeInTheDocument();
  });

  it('shows number buttons from max(1, count-3) to count+3', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={{ items: ['🍎', '🍎', '🍎', '🍎', '🍎'], count: 5, text: 'apples' }}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();

    expect(screen.getByLabelText('Count 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Count 8')).toBeInTheDocument();
    expect(() => screen.getByLabelText('Count 1')).toThrow();
  });

  it('selects a count and shows it in live region', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();
    fireEvent.click(screen.getByLabelText('Count 3'));

    expect(screen.getByText('Selected: 3')).toBeInTheDocument();
  });

  it('submits correct answer with score', () => {
    const emitInteraction = vi.fn();
    const complete = vi.fn();

    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={emitInteraction}
        complete={complete}
      />,
    );

    advanceObserve();
    fireEvent.click(screen.getByLabelText('Count 3'));
    act(() => {
      fireEvent.click(screen.getByText('Submit'));
    });

    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenLastCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'submit', count: 3, correct: true, accuracy: 1 }),
    );
    expect(screen.getByText('Correct! The answer is 3.')).toBeInTheDocument();
  });

  it('submits incorrect answer with partial accuracy', () => {
    const complete = vi.fn();

    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={complete}
      />,
    );

    advanceObserve();
    fireEvent.click(screen.getByLabelText('Count 5'));
    act(() => {
      fireEvent.click(screen.getByText('Submit'));
    });

    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenLastCalledWith(33.333333333333336);
    expect(screen.getByText('Not quite. The correct answer is 3.')).toBeInTheDocument();
  });

  it('disables submit button when no count selected', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();

    expect(screen.getByText('Submit')).toBeDisabled();
  });

  it('renders addition mode observe with left, plus, right, equals, total', () => {
    const config = {
      left: ['🍎', '🍎'],
      right: ['🍌', '🍌', '🍌'],
      sum: 5,
      text: 'fruit',
    };

    render(
      <WidgetComponent
        nodeId="test-node"
        config={config}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders addition mode interactive without total', () => {
    const config = {
      left: ['🍎', '🍎'],
      right: ['🍌', '🍌', '🍌'],
      sum: 5,
      text: 'fruit',
    };

    render(
      <WidgetComponent
        nodeId="test-node"
        config={config}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.queryByLabelText('equals')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Count 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Count 8')).toBeInTheDocument();
  });

  it('handles addition with left/right as number counts', () => {
    const emitInteraction = vi.fn();
    const complete = vi.fn();

    const config = { left: 2, right: 3, sum: 5 };

    render(
      <WidgetComponent
        nodeId="test-node"
        config={config}
        emitInteraction={emitInteraction}
        complete={complete}
      />,
    );

    advanceObserve();
    fireEvent.click(screen.getByLabelText('Count 5'));
    fireEvent.click(screen.getByText('Submit'));

    expect(complete).toHaveBeenCalledWith(100);
  });

  it('shows fallback message for empty items', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={{ items: [], count: 0, text: 'apples' }}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();

    expect(screen.getByText('No items to count.')).toBeInTheDocument();
  });

  it('displays a single hint', () => {
    const config = { ...baseConfig, hint: 'Count each apple carefully.' };

    render(
      <WidgetComponent
        nodeId="test-node"
        config={config}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();

    expect(screen.getByText('Count each apple carefully.')).toBeInTheDocument();
  });

  it('displays graduated hints and advances through them', () => {
    const config = {
      ...baseConfig,
      hints: ['Look at the apples.', 'Count one by one.', 'There are 3 apples.'],
    };

    render(
      <WidgetComponent
        nodeId="test-node"
        config={config}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();

    expect(screen.getByText('Look at the apples.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('More help'));
    expect(screen.getByText('Count one by one.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('More help'));
    expect(screen.getByText('There are 3 apples.')).toBeInTheDocument();
    expect(() => screen.getByText('More help')).toThrow();
  });

  it('renders items with correct aria-labels', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('aria-label', '🍎 1 of 3');
    expect(items[1]).toHaveAttribute('aria-label', '🍎 2 of 3');
    expect(items[2]).toHaveAttribute('aria-label', '🍎 3 of 3');
  });

  it('applies size classes correctly', () => {
    const sizes = [
      { size: 'sm', expected: '2rem' },
      { size: 'md', expected: '3rem' },
      { size: 'lg', expected: '4rem' },
    ] as const;

    for (const { size, expected } of sizes) {
      const { unmount } = render(
        <WidgetComponent
          nodeId="test-node"
          config={{ ...baseConfig, size }}
          emitInteraction={vi.fn()}
          complete={vi.fn()}
        />,
      );

      const spans = screen.getAllByRole('img', { hidden: true });
      expect(spans[0]).toHaveStyle({ fontSize: expected });
      unmount();
    }
  });

  it('renders config error for invalid config', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={{ invalid: true }}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('named export matches default export', () => {
    expect(visualCounting).toBe(VisualCountingWidget);
  });

  it('number buttons are keyboard accessible', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    advanceObserve();

    const button = screen.getByLabelText('Count 3');
    expect(button.tagName).toBe('BUTTON');
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
