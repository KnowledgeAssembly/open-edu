import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { WidgetRenderer } from './WidgetRenderer';
import { RuntimeProvider, useRuntime } from '../context/RuntimeContext';
import { createWidgetRegistry } from '@open-edu/widgets';
import type { LoadedPackage } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';
import type { NodeAnswer } from '@open-edu/schemas';

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
  navigateTo: ReturnType<typeof vi.fn>;
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
    navigateTo: vi.fn(),
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
    <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
      <RuntimeProvider loadedPackage={pkg} engine={engine} widgetRegistry={widgetRegistry}>
        {children}
      </RuntimeProvider>
    </I18nProvider>
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
    expect(screen.getByText(/runtime\.widget\.no_registered/)).toBeInTheDocument();
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

  it('saves answer in RuntimeContext when widget completes with state', () => {
    let capturedAnswers: Record<string, NodeAnswer> = {};
    function AnswersCapturer() {
      const { answers } = useRuntime();
      capturedAnswers = answers;
      return <div data-testid="captured">{JSON.stringify(answers)}</div>;
    }

    const registry = createWidgetRegistry();
    registry.register({
      id: 'answer-widget',
      version: '1.0.0',
      render: (props) => (
        <button onClick={() => props.complete(85, { completed: true })}>Complete</button>
      ),
    });

    const engine = makeEngine('nodes/ex-01.md');
    render(
      <RuntimeProvider loadedPackage={pkg} engine={engine} widgetRegistry={registry}>
        <AnswersCapturer />
        <WidgetRenderer
          node={{ type: 'exercise', widget: 'answer-widget' }}
          nodeId="nodes/ex-01.md"
        />
      </RuntimeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    const saved = capturedAnswers['nodes/ex-01.md'];
    expect(saved).toBeDefined();
    expect(saved?.type).toBe('widget');
    expect((saved as { data: unknown }).data).toEqual({ completed: true });
    expect((saved as { score?: number }).score).toBe(85);
  });

  it('passes storedState from answer saved before render', () => {
    let capturer: { saveAnswer: (id: string, a: NodeAnswer) => void } | null = null;
    function ContextAccessor() {
      const { saveAnswer, answers } = useRuntime();
      capturer = { saveAnswer };
      return <div data-testid="ctx-answers">{JSON.stringify(answers)}</div>;
    }

    const registry = createWidgetRegistry();
    registry.register({
      id: 'state-reader',
      version: '1.0.0',
      render: (props) => <div data-testid="stored">{JSON.stringify(props.storedState)}</div>,
    });

    const engine = makeEngine('nodes/ex-01.md');
    render(
      <RuntimeProvider loadedPackage={pkg} engine={engine} widgetRegistry={registry}>
        <ContextAccessor />
        <WidgetRenderer
          node={{ type: 'exercise', widget: 'state-reader' }}
          nodeId="nodes/ex-01.md"
        />
      </RuntimeProvider>,
    );

    act(() => {
      capturer!.saveAnswer('nodes/ex-01.md', {
        type: 'widget',
        widgetId: 'state-reader',
        data: { persisted: true },
      });
    });

    expect(screen.getByTestId('stored')).toHaveTextContent('{"persisted":true}');
  });

  it('passes storedState to widget on second render via initialProgress', () => {
    const registry = createWidgetRegistry();
    registry.register({
      id: 'state-reader',
      version: '1.0.0',
      render: (props) => <div data-testid="stored">{JSON.stringify(props.storedState)}</div>,
    });

    const engine = makeEngine('nodes/ex-01.md');
    const { unmount } = render(
      <RuntimeProvider loadedPackage={pkg} engine={engine} widgetRegistry={registry}>
        <WidgetRenderer
          node={{ type: 'exercise', widget: 'state-reader' }}
          nodeId="nodes/ex-01.md"
        />
      </RuntimeProvider>,
    );
    unmount();

    const engine2 = makeEngine('nodes/ex-01.md');
    render(
      <RuntimeProvider
        loadedPackage={pkg}
        engine={engine2}
        widgetRegistry={registry}
        initialProgress={{
          packageId: 'test',
          packageVersion: '1.0.0',
          currentNodeId: 'nodes/ex-01.md',
          visitedNodes: ['nodes/ex-01.md'],
          scores: {},
          answers: {
            'nodes/ex-01.md': {
              type: 'widget',
              widgetId: 'state-reader',
              data: { persisted: true },
            },
          },
          isCompleted: false,
          updatedAt: '2024-01-01T00:00:00.000Z',
        }}
      >
        <WidgetRenderer
          node={{ type: 'exercise', widget: 'state-reader' }}
          nodeId="nodes/ex-01.md"
        />
      </RuntimeProvider>,
    );

    expect(screen.getByTestId('stored')).toHaveTextContent('{"persisted":true}');
  });

  it('syncs reveal interactions to animation via step-sync machine', () => {
    const registry = createWidgetRegistry();
    registry.register({
      id: 'reveal-widget',
      version: '1.0.0',
      render: (props) => (
        <div data-testid="reveal-widget">
          <span data-testid="synced-count">{String(props.syncedRevealedCount ?? 'uncontrolled')}</span>
          <button
            type="button"
            onClick={() =>
              props.emitInteraction({
                action: 'reveal',
                step: (props.syncedRevealedCount ?? 0) + 1,
              })
            }
          >
            Reveal
          </button>
        </div>
      ),
    });

    renderWithProvider(
      pkg,
      'nodes/ex-01.md',
      {
        type: 'exercise',
        widget: 'reveal-widget',
        config: {
          steps: [
            { id: 'a', title: 'A' },
            { id: 'b', title: 'B' },
          ],
          animation: {
            backend: 'svg',
            src: '<svg xmlns="http://www.w3.org/2000/svg"><g id="a"/></svg>',
            trigger: 'step',
            effects: [
              { step: 1, target: 'a', effect: 'fade' },
              { step: 2, target: 'b', effect: 'fade' },
            ],
          },
        },
      },
      'nodes/ex-01.md',
      registry,
    );

    expect(screen.getByTestId('synced-count')).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(screen.getByTestId('synced-count')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(screen.getByTestId('synced-count')).toHaveTextContent('2');
  });
});
