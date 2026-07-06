import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { sequencing } from './Sequencing';

const WidgetComponent = sequencing.render;

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

const defaultItems = [
  { id: 'ignite', label: 'Ignite', emoji: '🔥' },
  { id: 'plan', label: 'Plan', emoji: '📋' },
  { id: 'execute', label: 'Execute', emoji: '🚀' },
];
const defaultCorrectOrder = ['ignite', 'plan', 'execute'];

function getItemIdsFromDom(): string[] {
  const items = screen.getAllByTestId(/^sortable-item-/);
  return items.map((el) => {
    const testId = el.getAttribute('data-testid')!;
    return testId.replace('sortable-item-', '');
  });
}

function expectedScore(order: string[], correct: string[]): number {
  const correctCount = order.filter((id, i) => id === correct[i]).length;
  return Math.round((correctCount / correct.length) * 100);
}

describe('Sequencing schema', () => {
  it('has correct widget id', () => {
    expect(sequencing.id).toBe('open-edu.sequencing');
  });

  it('has a render function', () => {
    expect(typeof sequencing.render).toBe('function');
  });
});

describe('Sequencing observe mode (interactive: false)', () => {
  const observeConfig = {
    items: defaultItems,
    correctOrder: defaultCorrectOrder,
    interactive: false,
  };

  it('renders items in correct order', () => {
    renderWidget(observeConfig);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Ignite');
    expect(items[1]).toHaveTextContent('Plan');
    expect(items[2]).toHaveTextContent('Execute');
  });

  it('does not show sortable list in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.queryByTestId('sortable-list')).toBeNull();
  });

  it('completes after clicking acknowledge in observe mode', () => {
    const { complete, emitInteraction } = renderWidget(observeConfig);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after acknowledge', () => {
    renderWidget(observeConfig);
    fireEvent.click(screen.getByText('Acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });

  it('renders description in observe mode', () => {
    renderWidget({ ...observeConfig, description: 'Order the steps' });
    expect(screen.getByText('Order the steps')).toBeTruthy();
  });

  it('shows config error for empty items', () => {
    renderWidget({ items: [], correctOrder: [], interactive: false });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for no config', () => {
    renderWidget({ interactive: false });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('Sequencing interactive mode (interactive: true)', () => {
  const interactiveConfig = {
    items: defaultItems,
    correctOrder: defaultCorrectOrder,
    interactive: true,
  };

  it('renders sortable list with all items', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('sortable-list')).toBeTruthy();
    expect(screen.getByTestId('sortable-item-ignite')).toBeTruthy();
    expect(screen.getByTestId('sortable-item-plan')).toBeTruthy();
    expect(screen.getByTestId('sortable-item-execute')).toBeTruthy();
  });

  it('submit button is always enabled because all items are in the list', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('renders description in interactive mode', () => {
    renderWidget({ ...interactiveConfig, description: 'Order the steps' });
    expect(screen.getByText('Order the steps')).toBeTruthy();
  });

  it('shows sequencing status live region', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('sequencing-status')).toHaveTextContent('3 of 3 items in sequence');
  });
});

describe('Sequencing submit and scoring', () => {
  const interactiveConfig = {
    items: defaultItems,
    correctOrder: defaultCorrectOrder,
    interactive: true,
  };

  it('calls complete with correct score on submit', () => {
    const { complete, emitInteraction } = renderWidget(interactiveConfig);
    const order = getItemIdsFromDom();
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(expectedScore(order, defaultCorrectOrder));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.sequencing' }),
    );
  });

  it('shows feedback after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
  });

  it('feedback message matches the actual order', () => {
    renderWidget(interactiveConfig);
    const order = getItemIdsFromDom();
    fireEvent.click(screen.getByText('Submit'));
    const correct = order.length === defaultCorrectOrder.length && order.every((id, i) => id === defaultCorrectOrder[i]);
    const correctCount = order.filter((id, i) => id === defaultCorrectOrder[i]).length;
    if (correct) {
      expect(screen.getByText('Correct! The sequence is in the right order.')).toBeTruthy();
    } else {
      expect(screen.getByText(`${correctCount} of ${defaultCorrectOrder.length} items in the right position.`)).toBeTruthy();
    }
  });

  it('submit button is removed after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.sequencing' }),
    );
  });
});

describe('Sequencing hints', () => {
  const hintConfig = {
    items: defaultItems,
    correctOrder: defaultCorrectOrder,
    interactive: true,
    hints: ['Hint 1', 'Hint 2'],
  };

  it('renders hint text when provided', () => {
    renderWidget({
      ...hintConfig,
      hint: 'Try ordering carefully.',
      hints: undefined,
    });
    expect(screen.getByText('Try ordering carefully.')).toBeTruthy();
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

describe('Sequencing keyboard accessibility', () => {
  const a11yConfig = {
    items: defaultItems,
    correctOrder: defaultCorrectOrder,
    interactive: true,
  };

  it('sortable items have proper aria labels', () => {
    renderWidget(a11yConfig);
    defaultItems.forEach((item) => {
      const el = screen.getByTestId(`sortable-item-${item.id}`);
      const label = el.getAttribute('aria-label');
      expect(label).toMatch(new RegExp(`^Step \\d+: ${item.label}$`));
    });
  });

  it('has tabIndex 0 on sortable items', () => {
    renderWidget(a11yConfig);
    expect(screen.getByTestId('sortable-item-ignite').getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('sortable-item-plan').getAttribute('tabindex')).toBe('0');
  });

  it('sortable items have role listitem', () => {
    renderWidget(a11yConfig);
    expect(screen.getByTestId('sortable-item-ignite').getAttribute('role')).toBe('listitem');
  });

  it('has live region for sequencing status', () => {
    renderWidget(a11yConfig);
    const status = screen.getByTestId('sequencing-status');
    expect(status.closest('[aria-live]')).toBeTruthy();
  });

  it('numbered step display appears on each item', () => {
    renderWidget(a11yConfig);
    defaultItems.forEach((item) => {
      const el = screen.getByTestId(`sortable-item-${item.id}`);
      expect(el.textContent).toMatch(/^\d+\./);
    });
  });

  it('has proper emoji display in observe mode labels', () => {
    renderWidget({ items: defaultItems, correctOrder: defaultCorrectOrder, interactive: false });
    expect(screen.getByLabelText('Step 1: Ignite')).toBeTruthy();
  });
});

describe('Sequencing edge cases', () => {
  it('defaults to observe mode when interactive not specified', () => {
    renderWidget({ items: defaultItems, correctOrder: defaultCorrectOrder });
    expect(screen.getByTestId('sequencing')).toBeTruthy();
    expect(screen.queryByTestId('sortable-list')).toBeNull();
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget({
      items: defaultItems,
      correctOrder: defaultCorrectOrder,
      interactive: false,
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('handles single item', () => {
    const { complete } = renderWidget({
      items: [{ id: 'only', label: 'Only' }],
      correctOrder: ['only'],
      interactive: true,
    });
    expect(screen.getByTestId('sortable-item-only')).toBeTruthy();
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('shows error for mismatched correctOrder and items', () => {
    renderWidget({
      items: defaultItems,
      correctOrder: ['nonexistent'],
      interactive: true,
    });
    expect(screen.getByTestId('sortable-item-ignite')).toBeTruthy();
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
  });
});

describe('Sequencing observe mode display', () => {
  it('shows correct order with emojis in observe mode', () => {
    renderWidget({
      items: defaultItems,
      correctOrder: defaultCorrectOrder,
      interactive: false,
    });
    const listItems = screen.getAllByRole('listitem');
    expect(listItems[0]).toHaveTextContent('🔥 Ignite');
    expect(listItems[1]).toHaveTextContent('📋 Plan');
    expect(listItems[2]).toHaveTextContent('🚀 Execute');
  });
});

describe('Sequencing sortable features', () => {
  const interactiveConfig = {
    items: defaultItems,
    correctOrder: defaultCorrectOrder,
    interactive: true,
  };

  it('all items are rendered in the sortable list', () => {
    renderWidget(interactiveConfig);
    const items = screen.getAllByTestId(/^sortable-item-/);
    expect(items).toHaveLength(3);
  });

  it('shows correct color coding after submit for correct position', () => {
    renderWidget(interactiveConfig);
    const order = getItemIdsFromDom();
    fireEvent.click(screen.getByText('Submit'));
    order.forEach((id, index) => {
      const item = screen.getByTestId(`sortable-item-${id}`);
      if (id === defaultCorrectOrder[index]) {
        expect(item.style.backgroundColor).toContain('success-container');
        expect(item).toHaveTextContent('✓');
      } else {
        expect(item.style.backgroundColor).toContain('error-container');
        expect(item).toHaveTextContent('✗');
      }
    });
  });

  it('shows corrected items below wrong positions after submit', () => {
    renderWidget(interactiveConfig);
    const order = getItemIdsFromDom();
    fireEvent.click(screen.getByText('Submit'));
    order.forEach((id, index) => {
      if (id !== defaultCorrectOrder[index]) {
        const correctItem = defaultItems.find((i) => i.id === defaultCorrectOrder[index]);
        if (correctItem) {
          expect(screen.getByText(new RegExp(`Correct:.*${correctItem.label}`))).toBeTruthy();
        }
      }
    });
  });
});
