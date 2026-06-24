import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RuntimeProvider } from '../context/RuntimeContext';
import type { LoadedPackage } from '@open-edu/core';
import type { WorkflowEngine } from '@open-edu/workflow';
import type { SkillGraph } from '@open-edu/schemas';
import { SkillSummary } from './SkillSummary';

function makePackage(nodes: LoadedPackage['nodes']): LoadedPackage {
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
    nodes,
    assetPaths: [],
  };
}

class StubEngine {
  start() {}
  stop() {}
  subscribe() {
    return () => {};
  }
  getCurrentNodeId() {
    return '';
  }
  isCompleted() {
    return false;
  }
  completeNode() {}
}

const skillGraph: SkillGraph = {
  skills: [
    { id: 'algebra.basics', name: 'Algebra Basics', maxScore: 100 },
    { id: 'algebra.advanced', name: 'Algebra Advanced', maxScore: 100 },
  ],
  assessments: [
    { nodeId: 'nodes/quiz-basics.json', skillId: 'algebra.basics', weight: 1.0 },
    { nodeId: 'nodes/quiz-advanced.json', skillId: 'algebra.advanced', weight: 1.0 },
  ],
};

describe('SkillSummary', () => {
  it('renders nothing when skillGraph is not provided', () => {
    const pkg = makePackage([
      {
        path: '/tmp/nodes/lesson-01.md',
        relativePath: 'nodes/lesson-01.md',
        content: '# Hello',
        node: { type: 'lesson' as const },
      },
    ]);
    const { container } = render(
      <RuntimeProvider loadedPackage={pkg} engine={new StubEngine() as unknown as WorkflowEngine}>
        <SkillSummary />
      </RuntimeProvider>,
    );
    expect(container.querySelector('[data-testid="skill-summary"]')).toBeNull();
  });

  it('renders skill names when skillGraph is provided', () => {
    const pkg = makePackage([
      {
        path: '/tmp/nodes/lesson-01.md',
        relativePath: 'nodes/lesson-01.md',
        content: '# Hello',
        node: { type: 'lesson' as const },
      },
    ]);
    render(
      <RuntimeProvider
        loadedPackage={pkg}
        engine={new StubEngine() as unknown as WorkflowEngine}
        skillGraph={skillGraph}
      >
        <SkillSummary />
      </RuntimeProvider>,
    );
    expect(screen.getByTestId('skill-summary')).toBeDefined();
    expect(screen.getByText('Algebra Basics')).toBeDefined();
    expect(screen.getByText('Algebra Advanced')).toBeDefined();
  });
});
