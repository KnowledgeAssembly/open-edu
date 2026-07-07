import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { matching } from './Matching';

const WidgetComponent = matching.render;

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

describe('Matching schema', () => {
  it('has correct widget id', () => {
    expect(matching.id).toBe('open-edu.matching');
  });

  it('has a render function', () => {
    expect(typeof matching.render).toBe('function');
  });
});

describe('Matching observe mode (interactive: false)', () => {
  const observeConfig = {
    pairs: [
      { id: '1', itemA: '🐶', itemB: 'Dog' },
      { id: '2', itemA: '🐱', itemB: 'Cat' },
    ],
    interactive: false,
  };

  it('renders both columns in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.getByTestId('observe-left-1')).toHaveTextContent('🐶');
    expect(screen.getByTestId('observe-left-2')).toHaveTextContent('🐱');
    expect(screen.getByTestId('observe-right-1')).toHaveTextContent('Dog');
    expect(screen.getByTestId('observe-right-2')).toHaveTextContent('Cat');
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
  });

  it('renders description in observe mode', () => {
    renderWidget({ ...observeConfig, description: 'Match the animals' });
    expect(screen.getByText('Match the animals')).toBeTruthy();
  });

  it('shows config error for empty pairs', () => {
    renderWidget({ pairs: [], interactive: false });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for no pairs', () => {
    renderWidget({ interactive: false });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('Matching interactive mode (interactive: true)', () => {
  const interactiveConfig = {
    pairs: [
      { id: '1', itemA: '🐶', itemB: 'Dog' },
      { id: '2', itemA: '🐱', itemB: 'Cat' },
      { id: '3', itemA: '🐮', itemB: 'Cow' },
    ],
    interactive: true,
  };

  it('renders left column items in order', () => {
    renderWidget(interactiveConfig);
    const leftItems = screen.getAllByRole('listitem');
    expect(leftItems[0]).toHaveTextContent('🐶');
    expect(leftItems[1]).toHaveTextContent('🐱');
    expect(leftItems[2]).toHaveTextContent('🐮');
  });

  it('renders all right column items', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByLabelText('Match with Dog')).toBeTruthy();
    expect(screen.getByLabelText('Match with Cat')).toBeTruthy();
    expect(screen.getByLabelText('Match with Cow')).toBeTruthy();
  });

  it('clicking left item selects it', () => {
    renderWidget(interactiveConfig);
    const dogItem = screen.getByTestId('left-item-1');
    fireEvent.click(dogItem);
    expect(dogItem.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking selected left item deselects it', () => {
    renderWidget(interactiveConfig);
    const dogItem = screen.getByTestId('left-item-1');
    fireEvent.click(dogItem);
    expect(dogItem.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(dogItem);
    expect(dogItem.getAttribute('aria-selected')).toBe('false');
  });

  it('clicking right item after left item creates connection', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    expect(screen.getByTestId('connections-status')).toHaveTextContent('1 of 3 pairs connected');
  });

  it('shows all correct when all pairs matched correctly', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByTestId('left-item-2'));
    fireEvent.click(screen.getByTestId('right-item-2'));
    fireEvent.click(screen.getByTestId('left-item-3'));
    fireEvent.click(screen.getByTestId('right-item-3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows partial correctness when some are wrong', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByTestId('left-item-2'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByTestId('left-item-3'));
    fireEvent.click(screen.getByTestId('right-item-3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(67, expect.any(Object));
  });

  it('shows zero correct when all are wrong', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-2'));
    fireEvent.click(screen.getByTestId('left-item-2'));
    fireEvent.click(screen.getByTestId('right-item-3'));
    fireEvent.click(screen.getByTestId('left-item-3'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('can undo a connection by clicking remove button', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    expect(screen.getByTestId('connections-status')).toHaveTextContent('1 of 3 pairs connected');
    fireEvent.click(screen.getByLabelText('Remove match for 🐶'));
    expect(screen.queryByTestId('connections-status')).toBeNull();
  });

  it('submit button enabled only when all left items are connected', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('left-item-2'));
    fireEvent.click(screen.getByTestId('right-item-2'));
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('left-item-3'));
    fireEvent.click(screen.getByTestId('right-item-3'));
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('submit button disabled after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByTestId('left-item-2'));
    fireEvent.click(screen.getByTestId('right-item-2'));
    fireEvent.click(screen.getByTestId('left-item-3'));
    fireEvent.click(screen.getByTestId('right-item-3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('shows feedback after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByTestId('left-item-2'));
    fireEvent.click(screen.getByTestId('right-item-2'));
    fireEvent.click(screen.getByTestId('left-item-3'));
    fireEvent.click(screen.getByTestId('right-item-3'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
  });

  it('handles single pair matching', () => {
    const { complete } = renderWidget({
      pairs: [{ id: '1', itemA: '🍎', itemB: 'Apple' }],
      interactive: true,
    });
    expect(screen.getByTestId('left-item-1')).toHaveTextContent('🍎');
    expect(screen.getByTestId('right-item-1')).toHaveTextContent('Apple');
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('renders description in interactive mode', () => {
    renderWidget({ ...interactiveConfig, description: 'Match the animals' });
    expect(screen.getByText('Match the animals')).toBeTruthy();
  });
});

describe('Matching hints', () => {
  const hintConfig = {
    pairs: [
      { id: '1', itemA: '🐶', itemB: 'Dog' },
      { id: '2', itemA: '🐱', itemB: 'Cat' },
    ],
    interactive: true,
    hints: ['Hint 1', 'Hint 2'],
  };

  it('renders hint text when provided', () => {
    renderWidget({
      ...hintConfig,
      hint: 'Try matching carefully.',
      hints: undefined,
    });
    expect(screen.getByText('Try matching carefully.')).toBeTruthy();
  });

  it('renders graduated hints with More help button', () => {
    renderWidget(hintConfig);
    expect(screen.getByText('Hint 1')).toBeTruthy();
    expect(screen.getByText('More help')).toBeTruthy();
    fireEvent.click(screen.getByText('More help'));
    expect(screen.getByText('Hint 2')).toBeTruthy();
    expect(screen.queryByText('More help')).toBeNull();
  });
});

describe('Matching keyboard accessibility', () => {
  const a11yConfig = {
    pairs: [
      { id: '1', itemA: '🐶', itemB: 'Dog' },
      { id: '2', itemA: '🐱', itemB: 'Cat' },
    ],
    interactive: true,
  };

  it('has proper aria labels on left items', () => {
    renderWidget(a11yConfig);
    expect(screen.getByLabelText('Match 🐶')).toBeTruthy();
    expect(screen.getByLabelText('Match 🐱')).toBeTruthy();
  });

  it('has proper aria labels on right items', () => {
    renderWidget(a11yConfig);
    expect(screen.getByLabelText('Match with Dog')).toBeTruthy();
    expect(screen.getByLabelText('Match with Cat')).toBeTruthy();
  });

  it('supports Enter key on left items', () => {
    renderWidget(a11yConfig);
    const dogItem = screen.getByTestId('left-item-1');
    fireEvent.keyDown(dogItem, { key: 'Enter' });
    expect(dogItem.getAttribute('aria-selected')).toBe('true');
  });

  it('supports Space key on left items', () => {
    renderWidget(a11yConfig);
    const dogItem = screen.getByTestId('left-item-1');
    fireEvent.keyDown(dogItem, { key: ' ' });
    expect(dogItem.getAttribute('aria-selected')).toBe('true');
  });

  it('supports Enter key on right items after left selection', () => {
    renderWidget(a11yConfig);
    fireEvent.keyDown(screen.getByTestId('left-item-1'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('right-item-1'), { key: 'Enter' });
    expect(screen.getByTestId('connections-status')).toHaveTextContent('1 of 2 pairs connected');
  });

  it('has live region for connection status', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    const status = screen.getByTestId('connections-status');
    expect(status.closest('[aria-live]')).toBeTruthy();
  });

  it('has aria-selected attribute on selected items', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    expect(screen.getByTestId('left-item-1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('left-item-2').getAttribute('aria-selected')).toBe('false');
  });

  it('has tabIndex 0 on left items', () => {
    renderWidget(a11yConfig);
    expect(screen.getByTestId('left-item-1').getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('left-item-2').getAttribute('tabindex')).toBe('0');
  });

  it('right items have tabIndex -1 when no left item selected', () => {
    renderWidget(a11yConfig);
    expect(screen.getByTestId('right-item-1').getAttribute('tabindex')).toBe('-1');
  });

  it('right items have tabIndex 0 when left item selected', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    expect(screen.getByTestId('right-item-1').getAttribute('tabindex')).toBe('0');
  });
});

describe('Matching persistence (storedState restoration)', () => {
  const interactiveConfig = {
    pairs: [
      { id: '1', itemA: '🐶', itemB: 'Dog' },
      { id: '2', itemA: '🐱', itemB: 'Cat' },
    ],
    interactive: true,
  };

  it('restores submitted state from storedState', () => {
    const storedState = {
      submitted: true,
      connections: { '1': '1', '2': '2' },
      hintIndex: 0,
    };
    render(
      <WidgetComponent
        nodeId="test-node"
        config={interactiveConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
        storedState={storedState}
      />,
    );
    expect(screen.getByTestId('feedback')).toBeTruthy();
    expect(screen.queryByText('Submit')).toBeNull();
    expect(screen.getByTestId('left-item-1')).toHaveTextContent('🐶');
    expect(screen.getByTestId('right-item-1')).toHaveTextContent('Dog');
  });

  it('restores connections from storedState', () => {
    const storedState = {
      submitted: true,
      connections: { '1': '1', '2': '2' },
      hintIndex: 0,
    };
    render(
      <WidgetComponent
        nodeId="test-node"
        config={interactiveConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
        storedState={storedState}
      />,
    );
    expect(screen.getByTestId('connections-status')).toHaveTextContent('2 of 2 pairs connected');
  });

  it('shows partial connections from storedState', () => {
    const storedState = {
      submitted: true,
      connections: { '1': '1' },
      hintIndex: 0,
    };
    render(
      <WidgetComponent
        nodeId="test-node"
        config={interactiveConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
        storedState={storedState}
      />,
    );
    expect(screen.getByTestId('connections-status')).toHaveTextContent('1 of 2 pairs connected');
  });

  it('ignores clicks when restored from submitted storedState', () => {
    const storedState = {
      submitted: true,
      connections: { '1': '1', '2': '2' },
      hintIndex: 0,
    };
    render(
      <WidgetComponent
        nodeId="test-node"
        config={interactiveConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
        storedState={storedState}
      />,
    );
    fireEvent.click(screen.getByTestId('left-item-1'));
    expect(screen.getByTestId('connections-status')).toHaveTextContent('2 of 2 pairs connected');
  });

  it('passes state object as second argument to complete on submit', () => {
    const complete = vi.fn();
    render(
      <WidgetComponent
        nodeId="test-node"
        config={interactiveConfig}
        emitInteraction={vi.fn()}
        complete={complete}
      />,
    );
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByTestId('left-item-2'));
    fireEvent.click(screen.getByTestId('right-item-2'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100, {
      submitted: true,
      connections: { '1': '1', '2': '2' },
      hintIndex: 0,
    });
  });
});

describe('Matching edge cases', () => {
  it('defaults to observe mode when interactive not specified', () => {
    renderWidget({
      pairs: [{ id: '1', itemA: '🐶', itemB: 'Dog' }],
    });
    expect(screen.getByTestId('observe-left-1')).toBeTruthy();
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget({
      pairs: [{ id: '1', itemA: '🐶', itemB: 'Dog' }],
      interactive: false,
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget({
      pairs: [
        { id: '1', itemA: '🐶', itemB: 'Dog' },
        { id: '2', itemA: '🐱', itemB: 'Cat' },
      ],
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    fireEvent.click(screen.getByTestId('left-item-2'));
    fireEvent.click(screen.getByTestId('right-item-2'));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.matching' }),
    );
  });

  it('shows config error for invalid config', () => {
    renderWidget({ interactive: true });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('Matching new features', () => {
  const interactiveConfig = {
    pairs: [
      { id: '1', itemA: '🐶', itemB: 'Dog' },
      { id: '2', itemA: '🐱', itemB: 'Cat' },
    ],
    interactive: true,
  };

  it('renders SVG connector lines between connected pairs', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    const svg = document.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeTruthy();
    const lines = svg?.querySelectorAll('line');
    expect(lines?.length).toBeGreaterThan(0);
  });

  it('click-to-rematch works without clicking remove button first', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    expect(screen.getByTestId('connections-status')).toHaveTextContent('1 of 2 pairs connected');
    fireEvent.click(screen.getByTestId('left-item-1'));
    expect(screen.getByTestId('left-item-1').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByTestId('right-item-2'));
    expect(screen.getByTestId('connections-status')).toHaveTextContent('1 of 2 pairs connected');
  });

  it('matched right items show checkmark and reduced opacity', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('left-item-1'));
    fireEvent.click(screen.getByTestId('right-item-1'));
    const rightItem = screen.getByTestId('right-item-1');
    expect(rightItem).toHaveTextContent('✓');
    expect(rightItem.style.opacity).toBe('0.6');
  });

  it('observe mode uses SVG lines not ASCII dashes', () => {
    renderWidget({ ...interactiveConfig, interactive: false });
    const svg = document.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeTruthy();
    const lines = svg?.querySelectorAll('line');
    expect(lines?.length).toBeGreaterThan(0);
    expect(screen.queryByText('───')).toBeNull();
  });
});
