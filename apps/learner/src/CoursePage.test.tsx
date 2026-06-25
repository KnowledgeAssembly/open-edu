import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CoursePage } from './CoursePage';
import type { LoadedPackage } from '@open-edu/core';

function createMockEngine() {
  return {
    subscribe: vi.fn(() => vi.fn()),
    start: vi.fn(),
    stop: vi.fn(),
    completeNode: vi.fn(),
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

describe('CoursePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrderedNodes.mockReturnValue(['nodes/lesson-01.md', 'nodes/lesson-02.md']);
  });

  it('renders course view with sidebar', () => {
    render(<CoursePage pkg={samplePackage} onBackToCatalog={vi.fn()} />);

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getAllByText('Test Course').length).toBeGreaterThan(0);
  });

  it('renders no-workflow fallback when package has no workflow', () => {
    const noWorkflowPkg = { ...samplePackage, workflow: null };
    render(<CoursePage pkg={noWorkflowPkg} onBackToCatalog={vi.fn()} />);

    expect(screen.getByText('Course not available')).toBeInTheDocument();
  });

  it('badge toast appears when a badge is earned', async () => {
    const pkgWithRewards: LoadedPackage = {
      ...samplePackage,
      rewards: {
        triggers: [
          {
            onEvent: 'node_complete',
            rewards: [{ action: 'badge.award', badge: 'test-badge' }],
          },
        ],
      },
    };

    const RewardBroker = vi.mocked((await import('@open-edu/rewards')).RewardBroker);
    let onReceipt: ((r: unknown) => void) | undefined;
    RewardBroker.mockImplementation((opts: any) => {
      onReceipt = opts.onReceipt;
      return createMockBroker() as any;
    });

    render(<CoursePage pkg={pkgWithRewards} onBackToCatalog={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    onReceipt!({
      actionId: 'reward-1',
      actionType: 'badge.award',
      dispatchedAt: Date.now(),
      status: 'delivered',
      detail: 'Test Badge',
    });

    await waitFor(() => {
      expect(screen.getByText('Badge earned!')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });
});
