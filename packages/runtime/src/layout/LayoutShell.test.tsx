import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LayoutShell } from './LayoutShell';
import { RuntimeProvider } from '../context/RuntimeContext';
import type { LoadedPackage, LoadedNode } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';

interface StubEngine {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  completeNode: ReturnType<typeof vi.fn>;
  __listener: ((e: WorkflowEvent) => void) | null;
}

function makeEngine(initialNodeId: string): StubEngine &
  WorkflowEngine & {
    __emit: (e: WorkflowEvent) => void;
  } {
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
    __emit: (e: WorkflowEvent) => stub.__listener?.(e),
  };
  return stub as unknown as StubEngine & WorkflowEngine & { __emit: (e: WorkflowEvent) => void };
}

function makeLoadedNode(relativePath: string, node: LoadedNode['node'], content = ''): LoadedNode {
  return { path: `/tmp/${relativePath}`, relativePath, content, node };
}

function makePackage(nodes: LoadedNode[]): LoadedPackage {
  return {
    rootDir: '/tmp/test',
    manifest: {
      id: 'test',
      title: 'My Course',
      version: '1.0.0',
      author: 'A',
      entry: nodes[0]?.relativePath ?? '',
    },
    workflow: { routing: {} },
    rewards: null,
    nodes,
    assetPaths: [],
  };
}

function renderShell(
  pkg: LoadedPackage,
  initialNodeId: string,
  props: Record<string, unknown> = {},
) {
  const engineRef = { current: makeEngine(initialNodeId) };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RuntimeProvider loadedPackage={pkg} engine={engineRef.current}>
      {children}
    </RuntimeProvider>
  );
  const utils = render(<LayoutShell {...props} />, { wrapper });
  return { ...utils, engine: engineRef.current };
}

describe('LayoutShell', () => {
  it('renders the package title in the header', () => {
    const pkg = makePackage([makeLoadedNode('nodes/lesson-01.md', { type: 'lesson' }, '# Intro')]);
    const { getByRole } = renderShell(pkg, 'nodes/lesson-01.md');
    expect(getByRole('heading', { level: 1, name: 'My Course' })).toBeInTheDocument();
  });

  it('renders the ProgressBar in the header', () => {
    const pkg = makePackage([
      makeLoadedNode('nodes/lesson-01.md', { type: 'lesson' }, '# Intro'),
      makeLoadedNode('nodes/lesson-02.md', { type: 'lesson' }, '# Next'),
    ]);
    const { getByRole } = renderShell(pkg, 'nodes/lesson-01.md');
    expect(getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders a Next button for lesson nodes', async () => {
    const pkg = makePackage([makeLoadedNode('nodes/lesson-01.md', { type: 'lesson' }, '# Intro')]);
    const { findByRole, engine } = renderShell(pkg, 'nodes/lesson-01.md');
    const button = await findByRole('button', { name: 'Next' });
    fireEvent.click(button);
    expect(engine.completeNode).toHaveBeenCalled();
  });

  it('hides Next button and shows hint for quiz/reflection nodes', () => {
    const pkg = makePackage([
      makeLoadedNode('nodes/quiz-01.md', {
        type: 'quiz',
        question: 'Q?',
        options: [
          { id: 'a', text: 'A', correct: true },
          { id: 'b', text: 'B', correct: false },
        ],
      }),
    ]);
    const { queryByRole, getByText } = renderShell(pkg, 'nodes/quiz-01.md');
    expect(queryByRole('button', { name: 'Next' })).toBeNull();
    expect(getByText(/Submit your answer above/)).toBeInTheDocument();
  });

  it('shows completion message when workflow is completed', async () => {
    const pkg = makePackage([makeLoadedNode('nodes/lesson-01.md', { type: 'lesson' }, '# Intro')]);
    const { findByText, queryByRole, engine } = renderShell(pkg, 'nodes/lesson-01.md', {
      completedLabel: 'All done!',
    });
    await waitFor(() => {
      engine.__emit({ type: 'workflow.completed', timestamp: 9 });
    });
    expect(await findByText('All done!')).toBeInTheDocument();
    expect(queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('renders children when passed instead of the default NodeRenderer', () => {
    const pkg = makePackage([makeLoadedNode('nodes/lesson-01.md', { type: 'lesson' }, '# Intro')]);
    const { getByText, queryByTestId } = renderShell(pkg, 'nodes/lesson-01.md', {
      children: <div data-testid="custom">Custom content</div>,
    });
    expect(getByText('Custom content')).toBeInTheDocument();
    expect(queryByTestId('markdown-renderer')).toBeNull();
  });

  it('default node rendering shows markdown for a lesson node', async () => {
    const pkg = makePackage([makeLoadedNode('nodes/lesson-01.md', { type: 'lesson' }, '# Intro')]);
    const { findByTestId } = renderShell(pkg, 'nodes/lesson-01.md');
    expect(await findByTestId('markdown-renderer')).toBeInTheDocument();
  });

  it('uses a custom header title when provided', () => {
    const pkg = makePackage([makeLoadedNode('nodes/lesson-01.md', { type: 'lesson' }, '# Intro')]);
    const { getByRole } = renderShell(pkg, 'nodes/lesson-01.md', {
      headerTitle: 'Custom Title',
    });
    expect(getByRole('heading', { level: 1, name: 'Custom Title' })).toBeInTheDocument();
  });
});
