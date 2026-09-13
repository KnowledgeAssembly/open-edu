import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import axe from 'axe-core';
import type { InteractiveNode } from '@open-edu/schemas';
import { InteractiveRenderer } from './InteractiveRenderer';
import { RuntimeProvider } from '../context/RuntimeContext';
import type { LoadedPackage, LoadedNode } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';

const NUMBER_LINE_SPEC = {
  type: 'visual',
  version: '1.0.0',
  id: 'number-line-test',
  purpose: {
    learningObjective: 'Identify the value 7 on a number line from 0 to 10',
    interactionGoal: 'Select the highlighted marker at position 7',
    reasoningMode: 'identify',
  },
  content: {
    kind: 'number-line',
    components: [
      {
        id: 'nl',
        type: 'number-line',
        props: { min: 0, max: 10, step: 1, highlight: [7] },
      },
    ],
  },
  accessibility: {
    label: 'Number line from zero to ten',
    description: 'A number line with 7 highlighted. Select the highlighted value.',
  },
  interaction: {
    mode: 'identify',
    actions: ['select', 'focus', 'reset'],
  },
};

function interactiveNode(): InteractiveNode {
  return {
    id: 'nl-node',
    title: 'Number line',
    type: 'interactive',
    engine: 'visual',
    spec: NUMBER_LINE_SPEC,
  };
}

function makeLoadedNode(relativePath: string, node: LoadedNode['node'], content = ''): LoadedNode {
  return {
    path: `/tmp/${relativePath}`,
    relativePath,
    content,
    node,
  };
}

function makePackage(
  nodes: Array<{ relativePath: string; node: LoadedNode['node'] }>,
): LoadedPackage {
  return {
    rootDir: '/tmp/test',
    manifest: {
      id: 'test',
      title: 'Test',
      version: '1.0.0',
      author: 'A',
      entry: 'nodes/nl-01.md',
    },
    workflow: { routing: {} },
    rewards: null,
    cards: null,
    nodes: nodes.map((n) => makeLoadedNode(n.relativePath, n.node)),
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
  ui: ReactNode,
  initialNodeId: string,
  engine = makeEngine(initialNodeId),
) {
  const pkg = makePackage([{ relativePath: initialNodeId, node: interactiveNode() }]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        {children}
      </RuntimeProvider>
    </I18nProvider>
  );
  const utils = render(ui, { wrapper });
  return { ...utils, engine };
}

async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });
  return results.violations;
}

describe('InteractiveRenderer', () => {
  it('renders node title as the activity prompt heading', async () => {
    const { getByRole } = renderWithProvider(
      <InteractiveRenderer node={interactiveNode()} nodeId="nodes/nl-01.md" />,
      'nodes/nl-01.md',
    );
    expect(getByRole('heading', { name: 'Number line' })).toBeInTheDocument();
  });

  it('mounts a single-engine interactive node', async () => {
    const { getByTestId } = renderWithProvider(
      <InteractiveRenderer node={interactiveNode()} nodeId="nodes/nl-01.md" />,
      'nodes/nl-01.md',
    );
    expect(getByTestId('interactive-renderer')).toBeInTheDocument();
  });

  it('renders prompt when node has a prompt field', async () => {
    const nodeWithPrompt: InteractiveNode = {
      ...interactiveNode(),
      prompt: 'Click the highlighted marker on the line.',
    };
    const { findByText } = renderWithProvider(
      <InteractiveRenderer node={nodeWithPrompt} nodeId="nodes/nl-01.md" />,
      'nodes/nl-01.md',
    );
    expect(await findByText('Click the highlighted marker on the line.')).toBeInTheDocument();
  });

  it('increments internal interaction count on SVG click and passes it on Mark complete', async () => {
    const { container, findByRole, getByRole, engine } = renderWithProvider(
      <InteractiveRenderer node={interactiveNode()} nodeId="nodes/nl-01.md" />,
      'nodes/nl-01.md',
    );
    await findByRole('heading', { name: 'Number line' });
    await waitFor(() => expect(getByRole('button', { name: 'Mark complete' })).not.toBeDisabled());
    const target = container.querySelector('#nl-label-7');
    expect(target).toBeTruthy();
    fireEvent.click(target!);
    fireEvent.click(getByRole('button', { name: 'Mark complete' }));
    expect(engine.completeNode).toHaveBeenCalledWith(undefined);
  });

  it('calls onComplete when reaching the mark complete button', async () => {
    const onComplete = vi.fn();
    const { getByRole } = renderWithProvider(
      <InteractiveRenderer
        node={interactiveNode()}
        nodeId="nodes/nl-01.md"
        onComplete={onComplete}
      />,
      'nodes/nl-01.md',
    );
    fireEvent.click(getByRole('button', { name: 'Mark complete' }));
    expect(onComplete).toHaveBeenCalledWith(undefined);
  });

  it('falls back to the runtime completeNode when no callback is supplied', async () => {
    const { getByRole, engine } = renderWithProvider(
      <InteractiveRenderer node={interactiveNode()} nodeId="nodes/nl-01.md" />,
      'nodes/nl-01.md',
    );
    fireEvent.click(getByRole('button', { name: 'Mark complete' }));
    expect(engine.completeNode).toHaveBeenCalledWith(undefined);
  });

  it('passes axe-core accessibility audits', async () => {
    const { container } = renderWithProvider(
      <InteractiveRenderer node={interactiveNode()} nodeId="nodes/nl-01.md" />,
      'nodes/nl-01.md',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const violations = await runAxe(container);
    expect(violations).toEqual([]);
  });

  it('mounts a composed interactive lesson', async () => {
    const composedNode: InteractiveNode = {
      type: 'interactive',
      id: 'independence-narrative-demo',
      title: 'Timeline drives visual focus',
      engines: [
        {
          instanceId: 'timeline-independence',
          engine: 'timeline',
          spec: {
            type: 'timeline',
            version: '1.0.0',
            id: 'timeline-independence',
            metadata: { title: 'Timeline' },
            purpose: { learningObjective: 'Explore events', reasoningMode: 'sequence' },
            content: {
              kind: 'events',
              events: [{ id: 'event-1947', label: 'Independence', date: '1947-08-15' }],
            },
            interaction: { mode: 'explore', actions: ['select'] },
            accessibility: { label: 'Timeline' },
          },
        },
        {
          instanceId: 'visual-independence',
          engine: 'visual',
          spec: {
            type: 'visual',
            version: '1.0.0',
            id: 'visual-independence',
            content: {
              kind: 'illustration',
              entities: [{ id: 'figure-independence', label: 'Independence' }],
            },
            interaction: { mode: 'explore', actions: ['focus', 'reset'] },
            accessibility: { label: 'Illustration' },
          },
        },
      ],
      bindings: [
        {
          on: 'timeline.event-selected',
          from: 'timeline-independence',
          dispatch: {
            to: 'visual-independence',
            action: 'focus',
            targetIdFrom: 'links.visualEntityId',
          },
        },
      ],
    };
    const pkg = makePackage([{ relativePath: 'nodes/composed.json', node: composedNode }]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
        <RuntimeProvider loadedPackage={pkg} engine={makeEngine('nodes/composed.json')}>
          {children}
        </RuntimeProvider>
      </I18nProvider>
    );
    const { getByTestId } = render(
      <InteractiveRenderer node={composedNode} nodeId="nodes/composed.json" />,
      { wrapper },
    );
    expect(getByTestId('interactive-renderer')).toBeInTheDocument();
  });

  afterEach(() => {
    cleanup();
  });
});
