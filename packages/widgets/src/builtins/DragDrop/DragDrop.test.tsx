import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { dragDrop } from './DragDrop';

const WidgetComponent = dragDrop.render;

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

const defaultConfig = {
  items: [
    { id: 'dog', label: 'Dog', emoji: '🐶' },
    { id: 'cat', label: 'Cat', emoji: '🐱' },
  ],
  targets: [
    { id: 'mammal', label: 'Mammal' },
    { id: 'fish', label: 'Fish' },
  ],
  expectedPositions: {
    dog: 'mammal',
    cat: 'mammal',
  },
};

describe('DragDrop schema', () => {
  it('has correct widget id', () => {
    expect(dragDrop.id).toBe('open-edu.drag-drop');
  });

  it('has a render function', () => {
    expect(typeof dragDrop.render).toBe('function');
  });
});

describe('DragDrop observe mode (interactive: false)', () => {
  const observeConfig = {
    ...defaultConfig,
    interactive: false,
  };

  it('renders targets with items placed correctly', () => {
    renderWidget(observeConfig);
    expect(screen.getByTestId('observe-target-mammal')).toBeTruthy();
    expect(screen.getByTestId('observe-target-fish')).toBeTruthy();
    expect(screen.getByTestId('observe-item-dog')).toHaveTextContent('Dog');
    expect(screen.getByTestId('observe-item-cat')).toHaveTextContent('Cat');
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
    renderWidget({ ...observeConfig, description: 'Sort the animals' });
    expect(screen.getByText('Sort the animals')).toBeTruthy();
  });

  it('shows config error for empty items', () => {
    renderWidget({ ...observeConfig, items: [], targets: [{ id: 't1', label: 'T1' }] });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for empty targets', () => {
    renderWidget({ ...observeConfig, items: [{ id: 'i1', label: 'I1' }], targets: [] });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('DragDrop interactive mode (interactive: true)', () => {
  const interactiveConfig = {
    ...defaultConfig,
    interactive: true,
  };

  it('renders unplaced items as clickable chips', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('unplaced-item-dog')).toHaveTextContent('Dog');
    expect(screen.getByTestId('unplaced-item-cat')).toHaveTextContent('Cat');
  });

  it('renders all targets', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('target-mammal')).toBeTruthy();
    expect(screen.getByTestId('target-fish')).toBeTruthy();
  });

  it('clicking unplaced item selects it', () => {
    renderWidget(interactiveConfig);
    const dogItem = screen.getByTestId('unplaced-item-dog');
    fireEvent.click(dogItem);
    expect(dogItem.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking selected item deselects it', () => {
    renderWidget(interactiveConfig);
    const dogItem = screen.getByTestId('unplaced-item-dog');
    fireEvent.click(dogItem);
    expect(dogItem.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(dogItem);
    expect(dogItem.getAttribute('aria-selected')).toBe('false');
  });

  it('clicking target after selecting item places it', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    expect(screen.getByTestId('placed-item-dog')).toBeTruthy();
    expect(screen.queryByTestId('unplaced-item-dog')).toBeNull();
  });

  it('can remove placed item back to unplaced pool', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    expect(screen.getByTestId('placed-item-dog')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Remove Dog from Mammal'));
    expect(screen.queryByTestId('placed-item-dog')).toBeNull();
    expect(screen.getByTestId('unplaced-item-dog')).toBeTruthy();
  });

  it('shows all correct when all items placed correctly', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByTestId('unplaced-item-cat'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('shows partial correctness when some are wrong', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByTestId('unplaced-item-cat'));
    fireEvent.click(screen.getByTestId('target-fish'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(50);
  });

  it('shows zero correct when all are wrong', () => {
    const interactiveConfig2 = {
      items: [
        { id: 'dog', label: 'Dog' },
        { id: 'cat', label: 'Cat' },
      ],
      targets: [
        { id: 'mammal', label: 'Mammal' },
        { id: 'fish', label: 'Fish' },
      ],
      expectedPositions: { dog: 'mammal', cat: 'fish' },
      interactive: true,
    };
    const { complete } = renderWidget(interactiveConfig2);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-fish'));
    fireEvent.click(screen.getByTestId('unplaced-item-cat'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0);
  });

  it('submit button enabled only when all items are placed', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    expect(screen.getByText('Submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('unplaced-item-cat'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('submit button disabled after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByTestId('unplaced-item-cat'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Submit')).toBeNull();
    expect(screen.getByTestId('result-display')).toBeDisabled();
  });

  it('shows feedback after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByTestId('unplaced-item-cat'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
  });

  it('handles single item single target', () => {
    const { complete } = renderWidget({
      items: [{ id: 'apple', label: 'Apple' }],
      targets: [{ id: 'fruit', label: 'Fruit' }],
      expectedPositions: { apple: 'fruit' },
      interactive: true,
    });
    expect(screen.getByTestId('unplaced-item-apple')).toHaveTextContent('Apple');
    expect(screen.getByTestId('target-fruit')).toBeTruthy();
    fireEvent.click(screen.getByTestId('unplaced-item-apple'));
    fireEvent.click(screen.getByTestId('target-fruit'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('renders description in interactive mode', () => {
    renderWidget({ ...interactiveConfig, description: 'Sort the animals' });
    expect(screen.getByText('Sort the animals')).toBeTruthy();
  });

  it('shows "All items placed" when all placed', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByTestId('unplaced-item-cat'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    expect(screen.getByText('All items placed')).toBeTruthy();
  });
});

describe('DragDrop hints', () => {
  const hintConfig = {
    ...defaultConfig,
    interactive: true,
    hints: ['Hint 1', 'Hint 2'],
  };

  it('renders hint text when provided', () => {
    renderWidget({
      ...hintConfig,
      hint: 'Try placing carefully.',
      hints: undefined,
    });
    expect(screen.getByText('Try placing carefully.')).toBeTruthy();
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

describe('DragDrop keyboard accessibility', () => {
  const a11yConfig = {
    ...defaultConfig,
    interactive: true,
  };

  it('has proper aria labels on unplaced items', () => {
    renderWidget(a11yConfig);
    expect(screen.getByLabelText('Item Dog 🐶')).toBeTruthy();
    expect(screen.getByLabelText('Item Cat 🐱')).toBeTruthy();
  });

  it('has proper aria labels on targets', () => {
    renderWidget(a11yConfig);
    expect(screen.getByLabelText('Drop zone: Mammal')).toBeTruthy();
    expect(screen.getByLabelText('Drop zone: Fish')).toBeTruthy();
  });

  it('supports Enter key on unplaced items', () => {
    renderWidget(a11yConfig);
    const dogItem = screen.getByTestId('unplaced-item-dog');
    fireEvent.keyDown(dogItem, { key: 'Enter' });
    expect(dogItem.getAttribute('aria-selected')).toBe('true');
  });

  it('supports Space key on unplaced items', () => {
    renderWidget(a11yConfig);
    const dogItem = screen.getByTestId('unplaced-item-dog');
    fireEvent.keyDown(dogItem, { key: ' ' });
    expect(dogItem.getAttribute('aria-selected')).toBe('true');
  });

  it('supports Enter key on target after item selection', () => {
    renderWidget(a11yConfig);
    fireEvent.keyDown(screen.getByTestId('unplaced-item-dog'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('target-mammal'), { key: 'Enter' });
    expect(screen.getByTestId('placed-item-dog')).toBeTruthy();
  });

  it('has live region for placement status', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    const status = screen.getByTestId('placement-status');
    expect(status.closest('[aria-live]')).toBeTruthy();
  });

  it('has aria-selected attribute on selected items', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    expect(screen.getByTestId('unplaced-item-dog').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('unplaced-item-cat').getAttribute('aria-selected')).toBe('false');
  });

  it('has tabIndex 0 on unplaced items', () => {
    renderWidget(a11yConfig);
    expect(screen.getByTestId('unplaced-item-dog').getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('unplaced-item-cat').getAttribute('tabindex')).toBe('0');
  });

  it('targets have tabIndex -1 when no item selected', () => {
    renderWidget(a11yConfig);
    expect(screen.getByTestId('target-mammal').getAttribute('tabindex')).toBe('-1');
    expect(screen.getByTestId('target-fish').getAttribute('tabindex')).toBe('-1');
  });

  it('targets have tabIndex 0 when item selected', () => {
    renderWidget(a11yConfig);
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    expect(screen.getByTestId('target-mammal').getAttribute('tabindex')).toBe('0');
  });
});

describe('DragDrop edge cases', () => {
  it('defaults to observe mode when interactive not specified', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('observe-target-mammal')).toBeTruthy();
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget({
      ...defaultConfig,
      interactive: false,
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget({
      ...defaultConfig,
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('unplaced-item-dog'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByTestId('unplaced-item-cat'));
    fireEvent.click(screen.getByTestId('target-mammal'));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'open-edu.drag-drop' }),
    );
  });

  it('shows config error for invalid config', () => {
    renderWidget({ interactive: true });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});
