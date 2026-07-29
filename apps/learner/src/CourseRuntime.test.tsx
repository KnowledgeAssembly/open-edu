import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CourseRuntime } from './CourseRuntime';
import type { LoadedPackage } from '@open-edu/core';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

const mockAddRewardMessage = vi.fn();
const mockClearPendingReward = vi.fn();

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
    subscribe: vi.fn(() => vi.fn()),
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
});
