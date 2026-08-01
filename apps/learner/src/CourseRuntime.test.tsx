import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CourseRuntime } from './CourseRuntime';
import type { LoadedPackage, LoadedBundle } from '@open-edu/core';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

const mockAddRewardMessage = vi.fn();
const mockClearPendingReward = vi.fn();

const mockInstances = vi.hoisted(() => ({
  telemetrySessions: [] as any[],
  rewardBrokers: [] as any[],
  cardBrokers: [] as any[],
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

const engineHandlers: Array<(event: { type: string; nodeId?: string; score?: number }) => void> =
  [];

vi.mock('./ai', () => ({
  useCompanion: () => ({
    pendingReward: false,
    rewardMessages: [],
    addRewardMessage: mockAddRewardMessage,
    clearPendingReward: mockClearPendingReward,
  }),
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

function createMockEngine() {
  return {
    subscribe: vi.fn(
      (handler?: (event: { type: string; nodeId?: string; score?: number }) => void) => {
        if (handler) engineHandlers.push(handler);
        return vi.fn();
      },
    ),
    start: vi.fn(),
    stop: vi.fn(),
    completeNode: vi.fn(),
    navigateTo: vi.fn(),
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
  TelemetrySession: vi.fn(() => {
    const session = createMockSession();
    mockInstances.telemetrySessions.push(session);
    return session;
  }),
}));

vi.mock('@open-edu/widgets', () => ({
  createDefaultRegistry: vi.fn(() => ({})),
}));

vi.mock('@open-edu/rewards', () => ({
  RewardBroker: vi.fn(() => {
    const broker = createMockBroker();
    mockInstances.rewardBrokers.push(broker);
    return broker;
  }),
  CardBroker: vi.fn(() => {
    const broker = createMockBroker();
    mockInstances.cardBrokers.push(broker);
    return broker;
  }),
  getDefaultContext: vi.fn(() => ({
    scores: {},
    skills: {},
    completedNodes: [],
    completedModules: [],
  })),
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
  CompletionScreen: () => <div data-testid="completion-screen" />,
  useRuntime: () => ({
    currentNodeId: '',
    visitedNodes: [],
    navigateToNode: vi.fn(),
  }),
}));

vi.mock('./cardsStorage.js', () => ({
  getAllCardProgress: vi.fn().mockResolvedValue({}),
  saveCardProgress: vi.fn().mockResolvedValue(undefined),
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
    engineHandlers.length = 0;
    mockInstances.telemetrySessions.length = 0;
    mockInstances.rewardBrokers.length = 0;
    mockInstances.cardBrokers.length = 0;
    mockInstances.onProgressChange = null;
    mockGetOrderedNodes.mockReturnValue(['nodes/lesson-01.md', 'nodes/lesson-02.md']);
  });

  it('renders course view with children', async () => {
    renderWithProvider(
      <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()}>
        <div data-testid="child-content">Sidebar content</div>
      </CourseRuntime>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
    expect(screen.getByTestId('course-runtime')).toBeInTheDocument();
  });

  it('renders no-workflow fallback when package has no workflow', async () => {
    const noWorkflowPkg = { ...samplePackage, workflow: null };
    renderWithProvider(<CourseRuntime pkg={noWorkflowPkg} onBackToCatalog={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Course not available')).toBeInTheDocument();
    });
  });

  it('renders children alongside course content', async () => {
    renderWithProvider(
      <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()}>
        <nav data-testid="section2-nav">Step list</nav>
      </CourseRuntime>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('section2-nav')).toBeInTheDocument();
    });
    expect(screen.getByTestId('course-runtime')).toBeInTheDocument();
  });

  it('emits bundle_complete when the last module completes', async () => {
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
            rewards: [{ action: 'badge.award', badge: 'bundle-finisher' }],
          },
        ],
      },
      cards: null,
    };
    const bundleContext = {
      bundleId: 'test-bundle',
      bundle,
      currentBundleProgress: null,
      onBundleSnapshot: vi.fn(),
    };

    renderWithProvider(
      <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()} bundleContext={bundleContext} />,
    );
    await waitFor(() => {
      expect(mockInstances.telemetrySessions.length).toBeGreaterThanOrEqual(2);
      expect(mockInstances.onProgressChange).not.toBeNull();
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
      const emittedEvents = mockInstances.telemetrySessions.flatMap((session: any) =>
        session.emit.mock.calls.map((c: any[]) => c[0].event),
      );
      expect(emittedEvents).toContain('module_complete');
      expect(emittedEvents).toContain('bundle_complete');
    });
  });

  it('updates the bundle broker context with completedModules on bundle completion', async () => {
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
            rewards: [{ action: 'badge.award', badge: 'bundle-finisher' }],
          },
        ],
      },
      cards: null,
    };
    const bundleContext = {
      bundleId: 'test-bundle',
      bundle,
      currentBundleProgress: null,
      onBundleSnapshot: vi.fn(),
    };

    renderWithProvider(
      <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()} bundleContext={bundleContext} />,
    );
    await waitFor(() => {
      expect(mockInstances.telemetrySessions.length).toBeGreaterThanOrEqual(2);
      expect(mockInstances.onProgressChange).not.toBeNull();
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
      const brokerContexts = mockInstances.rewardBrokers.flatMap((broker: any) =>
        broker.updateContext.mock.calls.map((c: any[]) => c[0]),
      );
      expect(brokerContexts).toContainEqual({
        completedModules: ['test-course'],
      });
    });
  });
});
