import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { WidgetRenderer } from './WidgetRenderer';
import { RuntimeProvider } from '../context/RuntimeContext';
import { createWidgetRegistry } from '@open-edu/widgets';
import type { LoadedPackage } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';

function makePackage(
  nodes: Array<{ relativePath: string; type: string; content: string }>,
): LoadedPackage {
  return {
    rootDir: '/tmp/test',
    manifest: {
      id: 'test',
      title: 'Test',
      version: '1.0.0',
      author: 'A',
      entry: 'nodes/lesson-01.md',
    },
    workflow: { routing: {} },
    rewards: null,
    cards: null,
    nodes: nodes.map((n) => ({
      path: `/tmp/${n.relativePath}`,
      relativePath: n.relativePath,
      content: n.content,
      node: { type: n.type, skills: undefined } as never,
    })),
    assetPaths: [],
  };
}

interface StubEngine {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  completeNode: ReturnType<typeof vi.fn>;
  __listener: ((e: WorkflowEvent) => void) | null;
}

function makeEngine(initialNodeId: string): StubEngine & WorkflowEngine {
  const stub = {
    start: vi.fn(() => {
      queueMicrotask(() =>
        stub.__listener?.({ type: 'node.entered', nodeId: initialNodeId, timestamp: 1 }),
      );
    }),
    stop: vi.fn(),
    subscribe: vi.fn((listener: (e: WorkflowEvent) => void) => {
      stub.__listener = listener;
      return () => {
        stub.__listener = null;
      };
    }),
    completeNode: vi.fn(),
    __listener: null as ((e: WorkflowEvent) => void) | null,
  };
  return stub as unknown as StubEngine & WorkflowEngine;
}

function renderWithProvider(
  pkg: LoadedPackage,
  initialNodeId: string,
  widgetRendererNode: { type: string; widget?: string; config?: Record<string, unknown> },
  nodeId: string,
  widgetRegistry?: ReturnType<typeof createWidgetRegistry>,
) {
  const engine = makeEngine(initialNodeId);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RuntimeProvider loadedPackage={pkg} engine={engine} widgetRegistry={widgetRegistry}>
      {children}
    </RuntimeProvider>
  );
  const utils = render(<WidgetRenderer node={widgetRendererNode} nodeId={nodeId} />, { wrapper });
  return { ...utils, engine };
}

describe('WidgetRenderer', () => {
  let pkg: LoadedPackage;

  beforeEach(() => {
    pkg = makePackage([{ relativePath: 'nodes/ex-01.md', type: 'exercise', content: '' }]);
  });

  it('renders a registered widget', () => {
    const registry = createWidgetRegistry();
    registry.register({
      id: 'test-widget',
      render: () => <div data-testid="test-widget-content">Hello Widget</div>,
    });

    renderWithProvider(
      pkg,
      'nodes/ex-01.md',
      { type: 'exercise', widget: 'test-widget' },
      'nodes/ex-01.md',
      registry,
    );

    expect(screen.getByTestId('test-widget-content')).toBeInTheDocument();
    expect(screen.getByText('Hello Widget')).toBeInTheDocument();
  });

  it('renders placeholder for unregistered widget', () => {
    const registry = createWidgetRegistry();

    renderWithProvider(
      pkg,
      'nodes/ex-01.md',
      { type: 'exercise', widget: 'nonexistent' },
      'nodes/ex-01.md',
      registry,
    );

    expect(screen.getByTestId('widget-renderer-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/nonexistent/)).toBeInTheDocument();
  });

  it('renders placeholder when widget registry is undefined', () => {
    renderWithProvider(pkg, 'nodes/ex-01.md', { type: 'exercise' }, 'nodes/ex-01.md', undefined);

    expect(screen.getByTestId('widget-renderer-placeholder')).toBeInTheDocument();
  });

  it('calls completeNode when widget completes', () => {
    const registry = createWidgetRegistry();
    registry.register({
      id: 'complete-widget',
      render: (props) => <button onClick={() => props.complete(85)}>Complete</button>,
    });

    const { engine } = renderWithProvider(
      pkg,
      'nodes/ex-01.md',
      { type: 'exercise', widget: 'complete-widget' },
      'nodes/ex-01.md',
      registry,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(engine.completeNode).toHaveBeenCalledWith(85);
  });

  it('catches thrown errors from widget render', () => {
    const registry = createWidgetRegistry();
    registry.register({
      id: 'broken-widget',
      render: () => {
        throw new Error('widget exploded');
      },
    });

    renderWithProvider(
      pkg,
      'nodes/ex-01.md',
      { type: 'exercise', widget: 'broken-widget' },
      'nodes/ex-01.md',
      registry,
    );

    expect(screen.getByTestId('widget-error-fallback')).toBeInTheDocument();
  });

  it('handles undefined node config', () => {
    const registry = createWidgetRegistry();
    registry.register({
      id: 'config-check',
      render: (props) => <div data-testid="config-output">{JSON.stringify(props.config)}</div>,
    });

    renderWithProvider(
      pkg,
      'nodes/ex-01.md',
      { type: 'exercise', widget: 'config-check' },
      'nodes/ex-01.md',
      registry,
    );

    expect(screen.getByTestId('config-output')).toBeInTheDocument();
    expect(screen.getByText('{}')).toBeInTheDocument();
  });
});
