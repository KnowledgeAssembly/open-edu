import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { chartReader } from './ChartReader';

const WidgetComponent = chartReader.render;

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

describe('ChartReader widget definition', () => {
  it('has correct widget id', () => {
    expect(chartReader.id).toBe('open-edu.chart-reader');
  });

  it('has a render function', () => {
    expect(typeof chartReader.render).toBe('function');
  });
});

describe('ChartReader bar mode', () => {
  const barConfig = {
    type: 'bar' as const,
    data: [
      { label: 'Apples', value: 10 },
      { label: 'Bananas', value: 20 },
      { label: 'Cherries', value: 15 },
    ],
    title: 'Fruit Sales',
    showValues: true,
  };

  it('renders chart title', () => {
    renderWidget(barConfig);
    expect(screen.getByText('Fruit Sales')).toBeInTheDocument();
  });

  it('renders bar labels', () => {
    renderWidget(barConfig);
    expect(screen.getByText('Apples')).toBeInTheDocument();
    expect(screen.getByText('Bananas')).toBeInTheDocument();
    expect(screen.getByText('Cherries')).toBeInTheDocument();
  });

  it('renders bar values when showValues is true', () => {
    renderWidget(barConfig);
    expect(screen.getByTestId('bar-value-Apples')).toHaveTextContent('10');
    expect(screen.getByTestId('bar-value-Bananas')).toHaveTextContent('20');
    expect(screen.getByTestId('bar-value-Cherries')).toHaveTextContent('15');
  });

  it('renders chart with role="img"', () => {
    renderWidget(barConfig);
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('bars have aria-labels with label and value', () => {
    renderWidget(barConfig);
    const bars = screen.getAllByRole('graphics-symbol');
    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveAttribute('aria-label', expect.stringContaining('Apples'));
    expect(bars[0]).toHaveAttribute('aria-label', expect.stringContaining('10'));
  });

  it('does not render bar values when showValues is false', () => {
    renderWidget({ ...barConfig, showValues: false });
    expect(screen.queryByTestId('bar-value-Apples')).toBeNull();
    expect(screen.queryByTestId('bar-value-Bananas')).toBeNull();
  });

  it('renders error for invalid config', () => {
    renderWidget({ type: 'bar', data: [] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('ChartReader pictograph mode', () => {
  const pictoConfig = {
    type: 'pictograph' as const,
    data: [
      { label: 'Dogs', value: 3, emoji: '🐕' },
      { label: 'Cats', value: 5, emoji: '🐈' },
    ],
    title: 'Pet Count',
    showValues: true,
  };

  it('renders chart title', () => {
    renderWidget(pictoConfig);
    expect(screen.getByText('Pet Count')).toBeInTheDocument();
  });

  it('renders row labels', () => {
    renderWidget(pictoConfig);
    expect(screen.getByText('Dogs')).toBeInTheDocument();
    expect(screen.getByText('Cats')).toBeInTheDocument();
  });

  it('renders correct number of emojis per row', () => {
    renderWidget(pictoConfig);
    const dogEmojis = screen.getByTestId('pictograph-emojis-Dogs');
    const catEmojis = screen.getByTestId('pictograph-emojis-Cats');
    expect(dogEmojis.children).toHaveLength(3);
    expect(catEmojis.children).toHaveLength(5);
  });

  it('renders values when showValues is true', () => {
    renderWidget(pictoConfig);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render values when showValues is false', () => {
    renderWidget({ ...pictoConfig, showValues: false });
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.queryByText('5')).toBeNull();
  });

  it('uses default emoji when not provided', () => {
    const config = {
      type: 'pictograph' as const,
      data: [{ label: 'Stars', value: 2 }],
    };
    renderWidget(config);
    const starRow = screen.getByTestId('pictograph-row-Stars');
    expect(starRow.textContent).toMatch(/★/);
  });

  it('renders error for empty data', () => {
    renderWidget({ type: 'pictograph', data: [] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('ChartReader observe mode', () => {
  const barConfig = {
    type: 'bar' as const,
    data: [
      { label: 'Apples', value: 10 },
      { label: 'Bananas', value: 20 },
    ],
    title: 'Fruit Sales',
  };

  it('completes after clicking acknowledge in observe mode', () => {
    const { complete, emitInteraction } = renderWidget(barConfig);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after acknowledge', () => {
    renderWidget(barConfig);
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByText('Content acknowledged.')).toBeInTheDocument();
  });

  it('does not auto-complete in interactive mode', () => {
    const { complete } = renderWidget({ ...barConfig, interactive: true, correctLabel: 'Apples' });
    expect(complete).not.toHaveBeenCalled();
  });
});

describe('ChartReader interactive mode - bar', () => {
  const interactiveBarConfig = {
    type: 'bar' as const,
    data: [
      { label: 'Apples', value: 10 },
      { label: 'Bananas', value: 20 },
      { label: 'Cherries', value: 15 },
    ],
    title: 'Fruit Sales',
    interactive: true,
    correctLabel: 'Bananas',
  };

  it('bars are clickable in interactive mode', () => {
    const { complete } = renderWidget(interactiveBarConfig);
    const bars = screen.getAllByRole('button');
    fireEvent.click(bars[1]!);
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('selecting correct label scores 100', () => {
    const { complete, emitInteraction } = renderWidget(interactiveBarConfig);
    const bars = screen.getAllByRole('button');
    fireEvent.click(bars[1]!);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ selectedLabel: 'Bananas', correct: true }),
    );
  });

  it('selecting incorrect label scores 0', () => {
    const { complete, emitInteraction } = renderWidget(interactiveBarConfig);
    const bars = screen.getAllByRole('button');
    fireEvent.click(bars[0]!);
    expect(complete).toHaveBeenCalledWith(0);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ selectedLabel: 'Apples', correct: false }),
    );
  });

  it('bars have role="button" in interactive mode', () => {
    renderWidget(interactiveBarConfig);
    const bars = screen.getAllByRole('button');
    expect(bars).toHaveLength(3);
  });

  it('cannot click after submission', () => {
    const { complete } = renderWidget(interactiveBarConfig);
    const bars = screen.getAllByRole('button');
    fireEvent.click(bars[1]!);
    expect(complete).toHaveBeenCalledTimes(1);
    fireEvent.click(bars[0]!);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('shows submitted state with correct label', () => {
    renderWidget(interactiveBarConfig);
    const bars = screen.getAllByRole('button');
    fireEvent.click(bars[1]!);
    expect(screen.getByTestId('chart-submitted')).toBeInTheDocument();
  });
});

describe('ChartReader interactive mode - pictograph', () => {
  const interactivePictoConfig = {
    type: 'pictograph' as const,
    data: [
      { label: 'Dogs', value: 3, emoji: '🐕' },
      { label: 'Cats', value: 5, emoji: '🐈' },
      { label: 'Fish', value: 2, emoji: '🐟' },
    ],
    title: 'Pet Count',
    interactive: true,
    correctLabel: 'Cats',
  };

  it('rows are clickable in interactive mode', () => {
    const { complete } = renderWidget(interactivePictoConfig);
    const rows = screen.getAllByRole('button');
    fireEvent.click(rows[1]!);
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('selecting correct label scores 100', () => {
    const { complete, emitInteraction } = renderWidget(interactivePictoConfig);
    const rows = screen.getAllByRole('button');
    fireEvent.click(rows[1]!);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ selectedLabel: 'Cats', correct: true }),
    );
  });

  it('selecting incorrect label scores 0', () => {
    const { complete } = renderWidget(interactivePictoConfig);
    const rows = screen.getAllByRole('button');
    fireEvent.click(rows[0]!);
    expect(complete).toHaveBeenCalledWith(0);
  });

  it('cannot click after submission', () => {
    const { complete } = renderWidget(interactivePictoConfig);
    const rows = screen.getAllByRole('button');
    fireEvent.click(rows[1]!);
    expect(complete).toHaveBeenCalledTimes(1);
    fireEvent.click(rows[0]!);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe('ChartReader error handling', () => {
  it('renders error for missing config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for invalid type', () => {
    renderWidget({ type: 'pie', data: [{ label: 'A', value: 1 }] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error when interactive but no correctLabel', () => {
    renderWidget({
      type: 'bar',
      data: [{ label: 'A', value: 1 }],
      interactive: true,
    });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});
