import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { RuntimeProvider, useRuntime } from './RuntimeContext';
import type { LoadedPackage } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';
import type { ReactNode } from 'react';

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

function makeEngine(): StubEngine & WorkflowEngine {
  const stub = {
    start: vi.fn(),
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

function emit(engine: StubEngine, event: WorkflowEvent) {
  engine.__listener?.(event);
}

describe('RuntimeProvider', () => {
  let engine: StubEngine & WorkflowEngine;
  let pkg: LoadedPackage;

  beforeEach(() => {
    pkg = makePackage([
      { relativePath: 'nodes/lesson-01.md', type: 'lesson', content: '# Hello' },
      { relativePath: 'nodes/lesson-02.md', type: 'lesson', content: '# World' },
    ]);
    engine = makeEngine();
  });

  it('starts the engine on mount and stops on unmount', () => {
    const { unmount } = render(
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        <span>child</span>
      </RuntimeProvider>,
    );
    expect(engine.start).toHaveBeenCalledTimes(1);
    unmount();
    expect(engine.stop).toHaveBeenCalledTimes(1);
  });

  it('subscribes to workflow events and unsubscribes on unmount', () => {
    const { unmount } = render(
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        <span>child</span>
      </RuntimeProvider>,
    );
    expect(engine.subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(engine.__listener).toBeNull();
  });

  it('updates currentNodeId on node.entered event', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        {children}
      </RuntimeProvider>
    );
    const { result, rerender } = renderHook(() => useRuntime(), { wrapper });
    act(() => {
      emit(engine, { type: 'node.entered', nodeId: 'nodes/lesson-01.md', timestamp: 1 });
    });
    rerender();
    expect(result.current.currentNodeId).toBe('nodes/lesson-01.md');
    expect(result.current.currentNode?.relativePath).toBe('nodes/lesson-01.md');
  });

  it('records scores on node.completed event', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        {children}
      </RuntimeProvider>
    );
    const { result } = renderHook(() => useRuntime(), { wrapper });
    act(() => {
      emit(engine, { type: 'node.entered', nodeId: 'nodes/quiz-01.md', timestamp: 1 });
    });
    act(() => {
      emit(engine, {
        type: 'node.completed',
        nodeId: 'nodes/quiz-01.md',
        score: 100,
        timestamp: 2,
      });
    });
    expect(result.current.scores['nodes/quiz-01.md']).toBe(100);
    expect(result.current.lastScore).toBe(100);
  });

  it('sets isCompleted on workflow.completed event', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        {children}
      </RuntimeProvider>
    );
    const { result } = renderHook(() => useRuntime(), { wrapper });
    act(() => {
      emit(engine, { type: 'workflow.completed', timestamp: 3 });
    });
    expect(result.current.isCompleted).toBe(true);
  });

  it('tracks visited nodes in order without duplicates', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        {children}
      </RuntimeProvider>
    );
    const { result } = renderHook(() => useRuntime(), { wrapper });
    act(() => {
      emit(engine, { type: 'node.entered', nodeId: 'nodes/lesson-01.md', timestamp: 1 });
    });
    act(() => {
      emit(engine, { type: 'node.entered', nodeId: 'nodes/lesson-02.md', timestamp: 2 });
    });
    expect(result.current.visitedNodes).toEqual(['nodes/lesson-01.md', 'nodes/lesson-02.md']);
  });

  it('completeNode delegates to the engine', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        {children}
      </RuntimeProvider>
    );
    const { result } = renderHook(() => useRuntime(), { wrapper });
    act(() => {
      result.current.completeNode(75);
    });
    expect(engine.completeNode).toHaveBeenCalledWith(75);
  });

  it('getNode returns a loaded node by relativePath', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RuntimeProvider loadedPackage={pkg} engine={engine}>
        {children}
      </RuntimeProvider>
    );
    const { result } = renderHook(() => useRuntime(), { wrapper });
    expect(result.current.getNode('nodes/lesson-02.md')?.content).toBe('# World');
    expect(result.current.getNode('missing.md')).toBeUndefined();
  });

  it('throws when useRuntime is used outside RuntimeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useRuntime())).toThrow(/RuntimeProvider/);
    spy.mockRestore();
  });
});
