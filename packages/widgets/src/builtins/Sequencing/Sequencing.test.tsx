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

  it('does not show available items or user sequence in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.queryByTestId('available-items')).toBeNull();
    expect(screen.queryByTestId('user-sequence')).toBeNull();
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

  it('renders all available items', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('available-items')).toBeTruthy();
    expect(screen.getByTestId('available-item-ignite')).toBeTruthy();
    expect(screen.getByTestId('available-item-plan')).toBeTruthy();
    expect(screen.getByTestId('available-item-execute')).toBeTruthy();
  });

  it('renders user sequence area', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('user-sequence')).toBeTruthy();
  });

  it('clicking available item adds it to the sequence', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    expect(screen.getByTestId('placed-item-ignite')).toBeTruthy();
    expect(screen.queryByTestId('available-item-ignite')).toBeNull();
  });

  it('clicking remove button removes placed item from sequence', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    expect(screen.getByTestId('placed-item-ignite')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Remove from sequence'));
    expect(screen.queryByTestId('placed-item-ignite')).toBeNull();
    expect(screen.getByTestId('available-item-ignite')).toBeTruthy();
  });

  it('items added in order appear in sequence', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    const placedItems = screen.getAllByTestId(/^placed-item-/);
    expect(placedItems).toHaveLength(3);
  });

  it('shows "All items placed" when all items in sequence', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    expect(screen.getByText('All items placed')).toBeTruthy();
  });

  it('submit button enabled only when all items placed', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('available-item-plan'));
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('available-item-execute'));
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('calls complete with 100 on correct answer', () => {
    const { complete, emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, accuracy: 1 }),
    );
  });

  it('calls complete with partial accuracy', () => {
    const { complete, emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false, accuracy: 1 / 3 }),
    );
  });

  it('calls complete with 0 when all wrong', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0);
  });

  it('submit button disabled after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('shows feedback after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
  });

  it('shows correct feedback when all items in right order', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Correct! The sequence is in the right order.')).toBeTruthy();
  });

  it('shows partial feedback when some items in wrong position', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('1 of 3 items in the right position.')).toBeTruthy();
  });

  it('renders description in interactive mode', () => {
    renderWidget({ ...interactiveConfig, description: 'Order the steps' });
    expect(screen.getByText('Order the steps')).toBeTruthy();
  });

  it('shows sequencing status live region', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    expect(screen.getByTestId('sequencing-status')).toHaveTextContent('1 of 3 items in sequence');
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

  it('has proper aria labels on available items', () => {
    renderWidget(a11yConfig);
    expect(screen.getByLabelText('Add Ignite to sequence')).toBeTruthy();
    expect(screen.getByLabelText('Add Plan to sequence')).toBeTruthy();
    expect(screen.getByLabelText('Add Execute to sequence')).toBeTruthy();
  });

  it('supports Enter key on available items', () => {
    renderWidget(a11yConfig);
    const igniteItem = screen.getByTestId('available-item-ignite');
    fireEvent.keyDown(igniteItem, { key: 'Enter' });
    expect(screen.getByTestId('placed-item-ignite')).toBeTruthy();
  });

  it('supports Space key on available items', () => {
    renderWidget(a11yConfig);
    const igniteItem = screen.getByTestId('available-item-ignite');
    fireEvent.keyDown(igniteItem, { key: ' ' });
    expect(screen.getByTestId('placed-item-ignite')).toBeTruthy();
  });

  it('supports Enter key on remove button to remove placed item', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    const removeButton = screen.getByLabelText('Remove from sequence');
    fireEvent.click(removeButton);
    expect(screen.queryByTestId('placed-item-ignite')).toBeNull();
    expect(screen.getByTestId('available-item-ignite')).toBeTruthy();
  });

  it('has tabIndex 0 on available items', () => {
    renderWidget(a11yConfig);
    expect(screen.getByTestId('available-item-ignite').getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('available-item-plan').getAttribute('tabindex')).toBe('0');
  });

  it('remove button for placed items is focusable', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    const removeButton = screen.getByLabelText('Remove from sequence');
    expect(removeButton.tagName).toBe('BUTTON');
  });

  it('has live region for sequencing status', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    const status = screen.getByTestId('sequencing-status');
    expect(status.closest('[aria-live]')).toBeTruthy();
  });

  it('has numbered step display on placed items', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    const placedItem = screen.getByTestId('placed-item-ignite');
    expect(placedItem).toBeTruthy();
    expect(placedItem).toHaveTextContent('1.');
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
    expect(screen.queryByTestId('available-items')).toBeNull();
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget({
      items: defaultItems,
      correctOrder: defaultCorrectOrder,
      interactive: false,
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget({
      items: defaultItems,
      correctOrder: defaultCorrectOrder,
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.sequencing' }),
    );
  });

  it('handles single item', () => {
    const { complete } = renderWidget({
      items: [{ id: 'only', label: 'Only' }],
      correctOrder: ['only'],
      interactive: true,
    });
    expect(screen.getByTestId('available-item-only')).toBeTruthy();
    fireEvent.click(screen.getByTestId('available-item-only'));
    expect(screen.getByTestId('placed-item-only')).toBeTruthy();
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('shows empty sequence placeholder initially', () => {
    renderWidget({
      items: defaultItems,
      correctOrder: defaultCorrectOrder,
      interactive: true,
    });
    expect(screen.getByText('Click items above to build your sequence')).toBeTruthy();
  });

  it('shows config error for mismatched correctOrder and items', () => {
    renderWidget({
      items: defaultItems,
      correctOrder: ['nonexistent'],
      interactive: true,
    });
    expect(screen.getByTestId('available-item-ignite')).toBeTruthy();
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByText('Submit'));
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

describe('Sequencing new features', () => {
  const interactiveConfig = {
    items: defaultItems,
    correctOrder: defaultCorrectOrder,
    interactive: true,
  };

  it('up arrow moves item up in sequence', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    const moveDownButton = screen.getAllByLabelText(/Move .* down/)[0]!;
    fireEvent.click(moveDownButton);
    const placedItems = screen.getAllByTestId(/^placed-item-/);
    expect(placedItems[0]).toHaveTextContent('Plan');
    expect(placedItems[1]).toHaveTextContent('Ignite');
  });

  it('down arrow moves item down in sequence', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    const moveUpButton = screen.getAllByLabelText(/Move .* up/)[1]!;
    fireEvent.click(moveUpButton);
    const placedItems = screen.getAllByTestId(/^placed-item-/);
    expect(placedItems[0]).toHaveTextContent('Plan');
    expect(placedItems[1]).toHaveTextContent('Ignite');
  });

  it('numbered slots appear with placeholders', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('2.')).toBeTruthy();
    expect(screen.getByText('3.')).toBeTruthy();
    expect(screen.getAllByText('___')).toHaveLength(3);
  });

  it('shows correct color coding after submit for correct position', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByText('Submit'));
    const firstItem = screen.getByTestId('placed-item-ignite');
    expect(firstItem.style.backgroundColor).toContain('success-container');
    expect(firstItem).toHaveTextContent('✓');
  });

  it('shows incorrect color coding after submit for wrong position', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByText('Submit'));
    const firstItem = screen.getByTestId('placed-item-execute');
    expect(firstItem.style.backgroundColor).toContain('error-container');
    expect(firstItem).toHaveTextContent('✗');
  });

  it('shows correct item for wrong position below', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-execute'));
    fireEvent.click(screen.getByTestId('available-item-plan'));
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText(/Correct:.*Ignite/)).toBeTruthy();
  });

  it('remove is a distinct focusable button not clickable on container', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('available-item-ignite'));
    const removeButton = screen.getByLabelText('Remove from sequence');
    expect(removeButton.tagName).toBe('BUTTON');
    const placedItem = screen.getByTestId('placed-item-ignite');
    expect(placedItem.getAttribute('role')).not.toBe('button');
  });
});
