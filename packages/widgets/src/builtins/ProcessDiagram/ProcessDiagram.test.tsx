import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { processDiagram } from './ProcessDiagram';

const WidgetComponent = processDiagram.render;

function renderWidget(config: Record<string, unknown> = {}) {
  const emitInteraction = vi.fn();
  const complete = vi.fn();
  const result = render(
    <WidgetComponent nodeId="test-node" config={config} emitInteraction={emitInteraction} complete={complete} />,
  );
  return { emitInteraction, complete, ...result };
}

const baseConfig = {
  nodes: [
    { id: 'a', title: 'Step A' },
    { id: 'b', title: 'Step B' },
    { id: 'c', title: 'Step C' },
  ],
  connections: [
    { from: 'a', to: 'b', type: 'arrow' },
    { from: 'b', to: 'c', type: 'arrow' },
  ],
  layout: 'horizontal',
  interactive: true,
  stepByStep: true,
};

describe('ProcessDiagram widget definition', () => {
  it('has correct widget id', () => {
    expect(processDiagram.id).toBe('science.process-diagram');
  });

  it('has correct domain', () => {
    expect(processDiagram.domain).toBe('science');
  });

  it('has stable status', () => {
    expect(processDiagram.status).toBe('stable');
  });
});

describe('ProcessDiagram rendering', () => {
  it('renders with valid config', () => {
    renderWidget(baseConfig);
    expect(screen.getByTestId('process-diagram')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    renderWidget({ ...baseConfig, title: 'Water Cycle' });
    expect(screen.getByText('Water Cycle')).toBeInTheDocument();
  });

  it('renders SVG nodes', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Step A')).toBeInTheDocument();
    expect(screen.getByText('Step B')).toBeInTheDocument();
    expect(screen.getByText('Step C')).toBeInTheDocument();
  });

  it('renders error for less than 2 nodes', () => {
    renderWidget({ nodes: [{ id: 'a', title: 'Only' }], connections: [] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('ProcessDiagram step-by-step', () => {
  it('shows reveal button initially', () => {
    renderWidget(baseConfig);
    expect(screen.getByTestId('reveal-next')).toBeInTheDocument();
  });

  it('shows step progress', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('reveals nodes one by one', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Step A')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(screen.getByText('Step B')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('emits reveal interaction', () => {
    const { emitInteraction } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'reveal', nodeIndex: 0 }),
    );
  });

  it('completes after revealing all nodes', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows completion message after all revealed', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(screen.getByText('All steps revealed!')).toBeInTheDocument();
  });
});

describe('ProcessDiagram observe mode', () => {
  it('shows acknowledge button in observe mode', () => {
    renderWidget({ ...baseConfig, interactive: false });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });

  it('completes after acknowledge', () => {
    const { complete } = renderWidget({ ...baseConfig, interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
  });
});

describe('ProcessDiagram accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget({ ...baseConfig, title: 'My Process' });
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'My Process');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has role="list" for process steps', () => {
    renderWidget(baseConfig);
    expect(screen.getByRole('list', { name: 'Process steps' })).toBeInTheDocument();
  });

  it('has aria-label on each step', () => {
    renderWidget(baseConfig);
    expect(screen.getByRole('listitem', { name: 'Step 1: Step A' })).toBeInTheDocument();
  });
});
