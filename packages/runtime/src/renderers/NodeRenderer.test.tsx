import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { NodeRenderer } from './NodeRenderer';
import { RuntimeProvider } from '../context/RuntimeContext';
import type { LoadedPackage, LoadedNode } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';

function makeLoadedNode(relativePath: string, node: LoadedNode['node'], content = ''): LoadedNode {
  return {
    path: `/tmp/${relativePath}`,
    relativePath,
    content,
    node,
  };
}

function makePackage(
  nodes: Array<{ relativePath: string; node: LoadedNode['node']; content?: string }>,
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
    nodes: nodes.map((n) => makeLoadedNode(n.relativePath, n.node, n.content)),
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
  node: ReturnType<typeof makeLoadedNode> | null,
) {
  const engineRef = { current: makeEngine(initialNodeId) };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RuntimeProvider loadedPackage={pkg} engine={engineRef.current}>
      {children}
    </RuntimeProvider>
  );
  const utils = render(<NodeRenderer node={node} />, { wrapper });
  return { ...utils, engine: engineRef.current };
}

describe('NodeRenderer', () => {
  it('renders MarkdownRenderer for lesson nodes', () => {
    const pkg = makePackage([
      { relativePath: 'nodes/lesson-01.md', node: { type: 'lesson' }, content: '# Hello' },
    ]);
    const { getByTestId, getByText } = renderWithProvider(
      pkg,
      'nodes/lesson-01.md',
      makeLoadedNode('nodes/lesson-01.md', { type: 'lesson' }, '# Hello'),
    );
    expect(getByTestId('markdown-renderer')).toBeInTheDocument();
    expect(getByText('Hello').tagName).toBe('H1');
  });

  it('renders QuizRenderer for quiz nodes', () => {
    const quizNode = {
      type: 'quiz' as const,
      question: 'Pick one',
      options: [
        { id: 'a', text: 'A', correct: true },
        { id: 'b', text: 'B', correct: false },
      ],
    };
    const pkg = makePackage([{ relativePath: 'nodes/quiz-01.md', node: quizNode }]);
    const { getByTestId } = renderWithProvider(
      pkg,
      'nodes/quiz-01.md',
      makeLoadedNode('nodes/quiz-01.md', quizNode),
    );
    expect(getByTestId('quiz-renderer')).toBeInTheDocument();
  });

  it('renders ReflectionRenderer for reflection nodes', () => {
    const reflectionNode = { type: 'reflection' as const, prompt: 'Reflect' };
    const pkg = makePackage([{ relativePath: 'nodes/reflection-01.md', node: reflectionNode }]);
    const { getByTestId } = renderWithProvider(
      pkg,
      'nodes/reflection-01.md',
      makeLoadedNode('nodes/reflection-01.md', reflectionNode),
    );
    expect(getByTestId('reflection-renderer')).toBeInTheDocument();
  });

  it('renders PlaceholderRenderer for exercise nodes', () => {
    const exerciseNode = { type: 'exercise' as const, skills: undefined };
    const pkg = makePackage([{ relativePath: 'nodes/ex-01.md', node: exerciseNode }]);
    const { getByTestId } = renderWithProvider(
      pkg,
      'nodes/ex-01.md',
      makeLoadedNode('nodes/ex-01.md', exerciseNode),
    );
    expect(getByTestId('placeholder-renderer')).toBeInTheDocument();
    expect(getByTestId('placeholder-renderer').textContent).toContain('exercise');
  });

  it('renders PlaceholderRenderer for custom (widget) nodes', () => {
    const customNode = {
      type: 'custom' as const,
      widget: 'code-editor',
      config: {},
      skills: undefined,
    };
    const pkg = makePackage([{ relativePath: 'nodes/widget-01.md', node: customNode }]);
    const { getByTestId } = renderWithProvider(
      pkg,
      'nodes/widget-01.md',
      makeLoadedNode('nodes/widget-01.md', customNode),
    );
    expect(getByTestId('placeholder-renderer').textContent).toContain('custom');
  });

  it('renders an empty loading state for null nodes', () => {
    const pkg = makePackage([{ relativePath: 'nodes/lesson-01.md', node: { type: 'lesson' } }]);
    const { getByTestId } = renderWithProvider(pkg, 'nodes/lesson-01.md', null);
    expect(getByTestId('node-renderer-empty').textContent).toContain('Loading');
  });
});
