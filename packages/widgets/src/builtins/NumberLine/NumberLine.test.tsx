import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { numberLine } from './NumberLine';

const WidgetComponent = numberLine.render;

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

describe('NumberLine widget definition', () => {
  it('has correct widget id', () => {
    expect(numberLine.id).toBe('math.number-line');
  });

  it('has correct domain', () => {
    expect(numberLine.domain).toBe('math');
  });

  it('has stable status', () => {
    expect(numberLine.status).toBe('stable');
  });
});

describe('NumberLine rendering', () => {
  it('renders with default config', () => {
    renderWidget({});
    expect(screen.getByTestId('number-line')).toBeInTheDocument();
  });

  it('renders number line with tick labels', () => {
    renderWidget({ min: 0, max: 5, step: 1, showLabels: true });
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders target instruction when interactive with target', () => {
    renderWidget({ min: 0, max: 10, target: 7, interactive: true });
    expect(screen.getByText('Find 7 on the number line')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget({});
    expect(screen.queryByTestId('widget-config-error')).not.toBeInTheDocument();
  });
});

describe('NumberLine observe mode', () => {
  it('shows acknowledge button in observe mode', () => {
    renderWidget({ min: 0, max: 10 });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });

  it('completes after acknowledge', () => {
    const { complete } = renderWidget({ min: 0, max: 10 });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
  });
});

describe('NumberLine interactive mode', () => {
  it('does not show acknowledge button when interactive', () => {
    renderWidget({ min: 0, max: 10, interactive: true });
    expect(screen.queryByTestId('observe-acknowledge')).not.toBeInTheDocument();
  });

  it('emits interaction on click', () => {
    const { emitInteraction } = renderWidget({ min: 0, max: 10, interactive: true });
    const svg = screen.getByTestId('number-line').querySelector('svg');
    fireEvent.click(svg!, { clientX: 300 });
    expect(emitInteraction).toHaveBeenCalledWith(expect.objectContaining({ action: 'place' }));
  });
});

describe('NumberLine accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget({ min: 0, max: 10 });
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Number line');
  });

  it('has role="img" with aria-label on SVG', () => {
    renderWidget({ min: 0, max: 10 });
    expect(screen.getByRole('img', { name: 'Number line from 0 to 10' })).toBeInTheDocument();
  });
});
