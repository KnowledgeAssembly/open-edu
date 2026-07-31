import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { CourseRuntime, type BundleCourseContext } from './CourseRuntime';
import type { LoadedPackage, LoadedBundle } from '@open-edu/core';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

const { mockAddRewardMessage, mockSaveCardProgress } = vi.hoisted(() => ({
  mockAddRewardMessage: vi.fn(),
  mockSaveCardProgress: vi.fn(),
}));

const mockInstances = vi.hoisted(() => ({
  sessions: [] as any[],
  onProgressChange: null as
    | ((snapshot: {
        packageId: string;
        packageVersion: string;
        currentNodeId: string;
        visitedNodes: string[];
        scores: Record<string, number>;
        answers: Record<string, unknown>;
        isCompleted: boolean;
        updatedAt: string;
      }) => void)
    | null,
}));

vi.mock('./ai', () => ({
  useCompanion: () => ({
    pendingReward: false,
    rewardMessages: [],
    addRewardMessage: mockAddRewardMessage,
    clearPendingReward: vi.fn(),
  }),
}));

function createLiveSession() {
  const subscribers = new Set<(event: any) => void>();
  return {
    start: vi.fn(),
    stop: vi.fn(),
    emit: vi.fn((data: any) => {
      for (const fn of subscribers) fn({ ...data });
    }),
    events$: {
      subscribe: vi.fn(({ next }: { next: (event: any) => void }) => {
        subscribers.add(next);
        return { unsubscribe: () => subscribers.delete(next) };
      }),
    },
  };
}

const { mockGetOrderedNodes } = vi.hoisted(() => ({
  mockGetOrderedNodes: vi.fn(),
}));

vi.mock('@open-edu/workflow', () => ({
  WorkflowEngine: vi.fn(() => ({
    subscribe: vi.fn(() => vi.fn()),
    start: vi.fn(),
    stop: vi.fn(),
    completeNode: vi.fn(),
    navigateTo: vi.fn(),
    getCurrentNodeId: vi.fn(() => ''),
  })),
  getOrderedNodes: mockGetOrderedNodes,
}));

vi.mock('@open-edu/telemetry', () => ({
  TelemetrySession: vi.fn(() => {
    const session = createLiveSession();
    mockInstances.sessions.push(session);
    return session;
  }),
}));

vi.mock('@open-edu/widgets', () => ({
  createDefaultRegistry: vi.fn(() => ({})),
}));

vi.mock('@open-edu/accessibility', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => children,
  LiveRegionProvider: ({ children }: { children: React.ReactNode }) => children,
  useLiveRegion: vi.fn(() => ({ announce: vi.fn() })),
}));

vi.mock('@open-edu/runtime', () => ({
  RuntimeProvider: ({
    onProgressChange,
    children,
  }: {
    onProgressChange?: (
      snapshot: Parameters<NonNullable<typeof mockInstances.onProgressChange>>[0],
    ) => void;
    children: React.ReactNode;
  }) => {
    mockInstances.onProgressChange = onProgressChange ?? null;
    return children;
  },
  LayoutShell: () => null,
  CompletionScreen: () => null,
  useRuntime: () => ({ currentNodeId: '', visitedNodes: [], navigateToNode: vi.fn() }),
}));

vi.mock('./cardsStorage.js', () => ({
  getAllCardProgress: vi.fn().mockResolvedValue({}),
  saveCardProgress: mockSaveCardProgress,
  getCardProgress: vi.fn().mockResolvedValue(null),
  clearCardProgress: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./progressStorage', () => ({
  getProgress: vi.fn(() => Promise.resolve(null)),
  saveProgress: vi.fn(() => Promise.resolve()),
}));

vi.mock('./badgesStorage', () => ({
  addBadge: vi.fn(() => Promise.resolve()),
  getBadges: vi.fn(() => Promise.resolve([])),
  getAllBadges: vi.fn(() => Promise.resolve({})),
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
  ],
  assetPaths: [],
};

function makeBundle(): { bundle: LoadedBundle; context: BundleCourseContext } {
  const bundle: LoadedBundle = {
    rootDir: '/test/bundle',
    manifest: {
      id: 'test-bundle',
      type: 'bundle',
      title: 'Test Bundle',
      version: '1.0.0',
      author: 'Test Author',
      modules: [
        { id: 'test-course', title: 'Test Course', path: './modules/test-course', dependsOn: [] },
      ],
    },
    modules: [samplePackage],
    moduleMap: new Map([['test-course', samplePackage]]),
    rewards: {
      triggers: [
        {
          onEvent: 'bundle_complete',
          rewards: [
            {
              action: 'badge.award',
              badge: 'bundle-finisher',
              condition: { type: 'bundleCompleted' },
            },
          ],
        },
      ],
    },
    cards: {
      cards: [
        {
          id: 'bundle-card',
          title: 'Bundle Card',
          type: 'achievement',
          category: 'Achievement',
          level: 1,
          maximumLevel: 1,
          summary: 'Finished every module',
          unlock: { type: 'bundleCompleted' },
        },
      ],
    },
  };
  return {
    bundle,
    context: {
      bundleId: 'test-bundle',
      bundle,
      currentBundleProgress: null,
      onBundleSnapshot: vi.fn(),
    },
  };
}

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('CourseRuntime bundle rewards (real brokers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInstances.sessions.length = 0;
    mockInstances.onProgressChange = null;
    mockGetOrderedNodes.mockReturnValue(['nodes/lesson-01.md']);
  });

  it('delivers the bundle-completion badge and unlocks the bundle card', async () => {
    const { context } = makeBundle();
    renderWithI18n(
      <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()} bundleContext={context} />,
    );

    await waitFor(() => {
      expect(mockInstances.sessions.length).toBeGreaterThanOrEqual(2);
    });

    act(() => {
      mockInstances.onProgressChange?.({
        packageId: 'test-course',
        packageVersion: '1.0.0',
        currentNodeId: 'nodes/lesson-01.md',
        visitedNodes: ['nodes/lesson-01.md'],
        scores: {},
        answers: {},
        isCompleted: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    await waitFor(() => {
      expect(mockAddRewardMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'badge', badgeName: 'bundle-finisher' }),
      );
    });
    expect(mockSaveCardProgress).toHaveBeenCalledWith('bundle-card', 1);
    expect(mockAddRewardMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'card', cardTitle: 'Bundle Card' }),
    );
  });

  it('does not fire the bundle badge for a module-local condition that never matches', async () => {
    const { bundle, context } = makeBundle();
    bundle.rewards = {
      triggers: [
        {
          onEvent: 'bundle_complete',
          rewards: [
            {
              action: 'badge.award',
              badge: 'should-not-award',
              condition: { type: 'chain', completedNodeIds: ['nodes/never.md'] },
            },
          ],
        },
      ],
    };
    renderWithI18n(
      <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()} bundleContext={context} />,
    );

    await waitFor(() => {
      expect(mockInstances.sessions.length).toBeGreaterThanOrEqual(2);
    });

    act(() => {
      mockInstances.onProgressChange?.({
        packageId: 'test-course',
        packageVersion: '1.0.0',
        currentNodeId: 'nodes/lesson-01.md',
        visitedNodes: ['nodes/lesson-01.md'],
        scores: {},
        answers: {},
        isCompleted: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockAddRewardMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ badgeName: 'should-not-award' }),
    );
  });
});
