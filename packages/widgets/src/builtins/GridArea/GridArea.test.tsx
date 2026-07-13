import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { gridArea } from './GridArea';

const WidgetComponent = gridArea.render;

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

function getCells() {
  return screen.getAllByRole('gridcell');
}

function cell(rowColIndex: number) {
  return getCells()[rowColIndex]!;
}

describe('GridArea schema', () => {
  it('has correct widget id', () => {
    expect(gridArea.id).toBe('math.grid-area');
  });

  it('has a render function', () => {
    expect(typeof gridArea.render).toBe('function');
  });
});

describe('GridArea observe mode (interactive: false)', () => {
  it('renders a grid with correct dimensions', () => {
    renderWidget({ rows: 3, cols: 4, interactive: false });
    const grid = screen.getByRole('grid');
    expect(grid).toBeTruthy();
    expect(grid.getAttribute('data-rows')).toBe('3');
    expect(grid.getAttribute('data-cols')).toBe('4');
    expect(getCells()).toHaveLength(12);
  });

  it('shows pre-highlighted cells in observe mode', () => {
    renderWidget({
      rows: 3,
      cols: 3,
      highlighted: [
        { row: 0, col: 0 },
        { row: 1, col: 1 },
      ],
      interactive: false,
    });
    expect(cell(0).getAttribute('data-highlighted')).toBe('true');
    expect(cell(4).getAttribute('data-highlighted')).toBe('true');
    expect(cell(1).getAttribute('data-highlighted')).toBe('false');
  });

  it('displays count of highlighted cells in observe mode', () => {
    renderWidget({
      rows: 3,
      cols: 3,
      highlighted: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 2, col: 2 },
      ],
      interactive: false,
    });
    expect(screen.getByTestId('count-display')).toBeTruthy();
    expect(screen.getByText('Area count: 3')).toBeTruthy();
  });

  it('completes when acknowledge button is clicked', () => {
    const { complete, emitInteraction } = renderWidget({
      rows: 2,
      cols: 2,
      highlighted: [{ row: 0, col: 0 }],
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

  it('shows content acknowledged after acknowledge click', () => {
    renderWidget({ rows: 2, cols: 2, highlighted: [{ row: 0, col: 0 }], interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });

  it('renders description in observe mode', () => {
    renderWidget({
      rows: 2,
      cols: 2,
      description: 'Count the highlighted cells',
      interactive: false,
    });
    expect(screen.getByText('Count the highlighted cells')).toBeTruthy();
  });

  it('hides count when showCount is false', () => {
    renderWidget({
      rows: 2,
      cols: 2,
      highlighted: [{ row: 0, col: 0 }],
      showCount: false,
      interactive: false,
    });
    expect(screen.queryByTestId('count-display')).toBeNull();
  });

  it('shows config error for invalid config', () => {
    renderWidget({ interactive: false });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('GridArea interactive mode - area', () => {
  it('renders clickable grid cells', () => {
    renderWidget({ rows: 3, cols: 3, interactive: true });
    const cells = getCells();
    expect(cells).toHaveLength(9);
    cells.forEach((c) => {
      expect(c.tagName.toLowerCase()).toBe('button');
    });
  });

  it('toggles cell highlight on click', () => {
    renderWidget({ rows: 2, cols: 2, interactive: true });
    expect(cell(0).getAttribute('data-highlighted')).toBe('false');
    fireEvent.click(cell(0));
    expect(cell(0).getAttribute('data-highlighted')).toBe('true');
    fireEvent.click(cell(0));
    expect(cell(0).getAttribute('data-highlighted')).toBe('false');
  });

  it('respects maxHighlights limit', () => {
    renderWidget({ rows: 2, cols: 2, maxHighlights: 2, interactive: true });
    fireEvent.click(cell(0));
    fireEvent.click(cell(1));
    expect(cell(0).getAttribute('data-highlighted')).toBe('true');
    expect(cell(1).getAttribute('data-highlighted')).toBe('true');
    fireEvent.click(cell(2));
    expect(cell(2).getAttribute('data-highlighted')).toBe('false');
  });

  it('shows status message when maxHighlights is reached', () => {
    renderWidget({ rows: 3, cols: 3, maxHighlights: 2, interactive: true });
    fireEvent.click(cell(0));
    fireEvent.click(cell(1));
    fireEvent.click(cell(2));
    expect(screen.getByTestId('max-highlights-message')).toHaveTextContent(
      'Maximum 2 cells selected',
    );
  });

  it('shows running count in interactive mode', () => {
    renderWidget({ rows: 2, cols: 2, interactive: true });
    expect(screen.getByText('Area count: 0')).toBeTruthy();
    fireEvent.click(cell(0));
    expect(screen.getByText('Area count: 1')).toBeTruthy();
    fireEvent.click(cell(1));
    expect(screen.getByText('Area count: 2')).toBeTruthy();
  });

  it('calls complete with 100 on exact count match', () => {
    const { complete, emitInteraction } = renderWidget({
      rows: 2,
      cols: 2,
      highlighted: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
      interactive: true,
    });
    fireEvent.click(cell(0));
    fireEvent.click(cell(1));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, count: 2 }),
    );
  });

  it('calls complete with 0 on count mismatch', () => {
    const { complete } = renderWidget({
      rows: 2,
      cols: 2,
      highlighted: [{ row: 0, col: 0 }],
      interactive: true,
    });
    fireEvent.click(cell(0));
    fireEvent.click(cell(1));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('shows feedback after submission', () => {
    renderWidget({
      rows: 2,
      cols: 2,
      highlighted: [{ row: 0, col: 0 }],
      interactive: true,
    });
    fireEvent.click(cell(0));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
    expect(screen.getByTestId('feedback').textContent).toBe('Correct! The area count is 1.');
  });

  it('shows incorrect feedback for wrong count', () => {
    renderWidget({
      rows: 2,
      cols: 2,
      highlighted: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
      interactive: true,
    });
    fireEvent.click(cell(0));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback').textContent).toBe(
      'Not quite. The correct area count is 2.',
    );
  });

  it('does not toggle after submission', () => {
    renderWidget({ rows: 2, cols: 2, highlighted: [{ row: 0, col: 0 }], interactive: true });
    fireEvent.click(cell(0));
    fireEvent.click(screen.getByText('Submit'));
    fireEvent.click(cell(1));
    expect(cell(1).getAttribute('data-highlighted')).toBe('false');
  });

  it('emits interaction with widget ID', () => {
    const { emitInteraction } = renderWidget({
      rows: 2,
      cols: 2,
      highlighted: [{ row: 0, col: 0 }],
      interactive: true,
    });
    fireEvent.click(cell(0));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'math.grid-area' }),
    );
  });

  it('renders description in interactive mode', () => {
    renderWidget({
      rows: 2,
      cols: 2,
      description: 'Highlight the correct cells',
      interactive: true,
    });
    expect(screen.getByText('Highlight the correct cells')).toBeTruthy();
  });
});

describe('GridArea perimeter mode', () => {
  it('counts perimeter cells instead of area', () => {
    renderWidget({
      rows: 3,
      cols: 3,
      mode: 'perimeter',
      highlighted: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ],
      interactive: false,
    });
    const highlightedCells = getCells().filter(
      (c) => c.getAttribute('data-highlighted') === 'true',
    );
    expect(highlightedCells).toHaveLength(8);
    expect(cell(4).getAttribute('data-highlighted')).toBe('false');
  });

  it('shows perimeter count label', () => {
    renderWidget({
      rows: 2,
      cols: 2,
      mode: 'perimeter',
      highlighted: [{ row: 0, col: 0 }],
      interactive: false,
    });
    expect(screen.getByText(/Perimeter count:/)).toBeTruthy();
  });

  it('computes perimeter from interactive toggles', () => {
    renderWidget({
      rows: 3,
      cols: 3,
      mode: 'perimeter',
      interactive: true,
    });
    fireEvent.click(cell(0));
    expect(cell(0).getAttribute('data-highlighted')).toBe('true');
    expect(screen.getByText(/Perimeter count: 1/)).toBeTruthy();
    fireEvent.click(cell(1));
    expect(cell(0).getAttribute('data-highlighted')).toBe('true');
    expect(cell(1).getAttribute('data-highlighted')).toBe('true');
  });

  it('shows perimeter feedback on submit', () => {
    renderWidget({
      rows: 2,
      cols: 2,
      mode: 'perimeter',
      highlighted: [{ row: 0, col: 0 }],
      interactive: true,
    });
    fireEvent.click(cell(0));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback').textContent).toBe('Correct! The perimeter count is 1.');
  });
});

describe('GridArea accessibility', () => {
  it('has grid role on container', () => {
    renderWidget({ rows: 3, cols: 3 });
    expect(screen.getByRole('grid')).toBeTruthy();
  });

  it('has aria-label on grid', () => {
    renderWidget({ rows: 3, cols: 3 });
    expect(screen.getByRole('grid').getAttribute('aria-label')).toContain('Grid');
  });

  it('announces cell positions', () => {
    renderWidget({ rows: 2, cols: 2 });
    expect(cell(0).getAttribute('aria-label')).toBe('Row 1, Column 1');
    expect(cell(3).getAttribute('aria-label')).toBe('Row 2, Column 2');
  });

  it('announces highlighted cells', () => {
    renderWidget({
      rows: 2,
      cols: 2,
      highlighted: [{ row: 0, col: 0 }],
      interactive: false,
    });
    expect(cell(0).getAttribute('aria-label')).toContain('highlighted');
  });

  it('has aria-pressed on grid cells', () => {
    renderWidget({ rows: 2, cols: 2, interactive: true });
    expect(cell(0).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(cell(0));
    expect(cell(0).getAttribute('aria-pressed')).toBe('true');
  });

  it('has live region for count display', () => {
    renderWidget({ rows: 2, cols: 2, interactive: true });
    const countDisplay = screen.getByTestId('count-display');
    expect(countDisplay.getAttribute('aria-live')).toBe('polite');
  });

  it('has focus-visible ring classes on cells', () => {
    renderWidget({ rows: 2, cols: 2, interactive: true });
    const c = cell(0);
    expect(c.className).toContain('focus-visible:ring-2');
    expect(c.className).toContain('focus-visible:ring-primary');
  });

  it('has hover classes on non-highlighted cells', () => {
    renderWidget({ rows: 2, cols: 2, interactive: true });
    const c = cell(0);
    expect(c.className).toContain('hover:bg-primary-container/30');
  });

  it('does not have outline:none on cells', () => {
    renderWidget({ rows: 2, cols: 2, interactive: true });
    const c = cell(0);
    expect(c.style.outline).not.toBe('none');
  });
});

describe('GridArea large grid keyboard navigation', () => {
  it('supports arrow key navigation on grids > 100 cells', () => {
    renderWidget({ rows: 11, cols: 11, interactive: true });
    const grid = screen.getByRole('grid');
    const cells = getCells();

    cells[0]?.focus();
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    const focused = document.activeElement;
    expect(focused?.getAttribute('aria-label')).toBe('Row 1, Column 2');
  });

  it('arrow down moves to next row', () => {
    renderWidget({ rows: 11, cols: 11, interactive: true });
    const grid = screen.getByRole('grid');
    const cells = getCells();

    cells[0]?.focus();
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    const focused = document.activeElement;
    expect(focused?.getAttribute('aria-label')).toBe('Row 2, Column 1');
  });

  it('arrow up at top row stays at top', () => {
    renderWidget({ rows: 11, cols: 11, interactive: true });
    const grid = screen.getByRole('grid');
    const cells = getCells();

    cells[0]?.focus();
    fireEvent.keyDown(grid, { key: 'ArrowUp' });
    const focused = document.activeElement;
    expect(focused?.getAttribute('aria-label')).toBe('Row 1, Column 1');
  });

  it('arrow left at first column stays at first column', () => {
    renderWidget({ rows: 11, cols: 11, interactive: true });
    const grid = screen.getByRole('grid');
    const cells = getCells();

    cells[0]?.focus();
    fireEvent.keyDown(grid, { key: 'ArrowLeft' });
    const focused = document.activeElement;
    expect(focused?.getAttribute('aria-label')).toBe('Row 1, Column 1');
  });

  it('does not enable arrow navigation on small grids', () => {
    renderWidget({ rows: 3, cols: 3, interactive: true });
    const grid = screen.getByRole('grid');
    const cells = getCells();

    cells[0]?.focus();
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    const focused = document.activeElement;
    expect(focused?.getAttribute('aria-label')).toBe('Row 1, Column 1');
  });
});

describe('GridArea edge cases', () => {
  it('defaults to area mode', () => {
    renderWidget({ rows: 2, cols: 2, interactive: true });
    expect(screen.getByText(/Area count:/)).toBeTruthy();
  });

  it('defaults to observe mode when interactive not specified', () => {
    renderWidget({ rows: 2, cols: 2 });
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('applies custom cellSize', () => {
    renderWidget({ rows: 2, cols: 2, cellSize: 60, interactive: false });
    expect(cell(0).style.width).toBe('60px');
    expect(cell(0).style.height).toBe('60px');
  });

  it('handles 1x1 grid', () => {
    renderWidget({ rows: 1, cols: 1, interactive: true });
    expect(getCells()).toHaveLength(1);
  });

  it('handles 20x20 grid', () => {
    renderWidget({ rows: 20, cols: 20, interactive: false });
    expect(getCells()).toHaveLength(400);
  });
});
