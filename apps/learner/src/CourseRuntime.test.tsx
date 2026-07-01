import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseRuntime } from './CourseRuntime';
import type { LoadedPackage } from '@open-edu/core';

function createMockEngine() {
  return {
    subscribe: vi.fn(() => vi.fn()),
    start: vi.fn(),
    stop: vi.fn(),
    completeNode: vi.fn(),
    getCurrentNodeId: vi.fn(() => ''),
  };
}

function createMockSession() {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    emit: vi.fn(),
    events$: {
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    },
  };
}

function createMockBroker() {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    awardedBadges: [],
    updateContext: vi.fn(),
  };
}

const { mockGetOrderedNodes } = vi.hoisted(() => ({
  mockGetOrderedNodes: vi.fn(),
}));

vi.mock('@open-edu/workflow', () => ({
  WorkflowEngine: vi.fn(() => createMockEngine()),
  getOrderedNodes: mockGetOrderedNodes,
}));

vi.mock('@open-edu/telemetry', () => ({
  TelemetrySession: vi.fn(() => createMockSession()),
}));

vi.mock('@open-edu/widgets', () => ({
  createDefaultRegistry: vi.fn(() => ({})),
}));

vi.mock('@open-edu/rewards', () => ({
  RewardBroker: vi.fn(() => createMockBroker()),
}));

vi.mock('@open-edu/accessibility', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => children,
  LiveRegionProvider: ({ children }: { children: React.ReactNode }) => children,
  useLiveRegion: vi.fn(() => ({ announce: vi.fn() })),
}));

vi.mock('./progressStorage', () => ({
  getProgress: vi.fn(() => null),
  saveProgress: vi.fn(),
}));

vi.mock('./badgesStorage', () => ({
  addBadge: vi.fn(),
  getBadges: vi.fn(() => []),
  getAllBadges: vi.fn(() => ({})),
}));

const samplePackage: LoadedPackage = {
  rootDir: '/test/course',
  manifest: {
    id: 'test-course',
    title: 'Test Course',
    version: '1.0.0',
    author: 'Test Author',
    entry: 'nodes/lesson-01.md',
  },
  workflow: {
    version: '0.1.0',
    routing: {
      'nodes/lesson-01.md': { onComplete: 'nodes/lesson-02.md' } as const,
      'nodes/lesson-02.md': {} as const,
    },
  } as any,
  rewards: null,
  cards: null,
  nodes: [
    {
      path: '/test/course/nodes/lesson-01.md',
      relativePath: 'nodes/lesson-01.md',
      content: '# Lesson 1',
      node: { type: 'lesson', title: 'Lesson 1' } as any,
    },
    {
      path: '/test/course/nodes/lesson-02.md',
      relativePath: 'nodes/lesson-02.md',
      content: '# Lesson 2',
      node: { type: 'lesson', title: 'Lesson 2' } as any,
    },
  ],
  assetPaths: [],
};

describe('CourseRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrderedNodes.mockReturnValue(['nodes/lesson-01.md', 'nodes/lesson-02.md']);
  });

  it('renders course view with children', () => {
    render(
      <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()}>
        <div data-testid="child-content">Sidebar content</div>
      </CourseRuntime>,
    );
    expect(screen.getByTestId('course-runtime')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders no-workflow fallback when package has no workflow', () => {
    const noWorkflowPkg = { ...samplePackage, workflow: null };
    render(<CourseRuntime pkg={noWorkflowPkg} onBackToCatalog={vi.fn()} />);
    expect(screen.getByText('Course not available')).toBeInTheDocument();
  });

  it('renders children alongside course content', () => {
    render(
      <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()}>
        <nav data-testid="section2-nav">Step list</nav>
      </CourseRuntime>,
    );
    expect(screen.getByTestId('section2-nav')).toBeInTheDocument();
    expect(screen.getByTestId('course-runtime')).toBeInTheDocument();
  });
});
