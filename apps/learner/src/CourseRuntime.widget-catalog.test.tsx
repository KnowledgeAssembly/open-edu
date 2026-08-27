import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';
import type { LoadedPackage } from '@open-edu/core';
import type * as Widgets from '@open-edu/widgets';

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

vi.mock('@open-edu/workflow', () => ({
  WorkflowEngine: vi.fn(() => ({
    subscribe: vi.fn(() => vi.fn()),
    start: vi.fn(),
    stop: vi.fn(),
    completeNode: vi.fn(),
    navigateTo: vi.fn(),
    getCurrentNodeId: vi.fn(() => ''),
  })),
  getOrderedNodes: vi.fn(() => ['nodes/lesson-01.md', 'nodes/lesson-02.md']),
}));

vi.mock('@open-edu/telemetry', () => ({
  TelemetrySession: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    emit: vi.fn(),
    events$: { subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) },
  })),
}));

vi.mock('@open-edu/rewards', () => ({
  RewardBroker: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    updateContext: vi.fn(),
  })),
  CardBroker: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    updateContext: vi.fn(),
  })),
}));

vi.mock('@open-edu/accessibility', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@open-edu/runtime', () => ({
  RuntimeProvider: ({ children }: { children: React.ReactNode }) => children,
  LayoutShell: () => null,
  CompletionScreen: () => <div data-testid="completion-screen" />,
  RewardEventBridge: () => null,
  useRuntime: () => ({ currentNodeId: '', visitedNodes: [], navigateToNode: vi.fn() }),
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

const resolverCalls: Array<{ catalogs: unknown; policy: unknown }> = [];
vi.mock('@open-edu/widgets', async (importOriginal) => {
  const actual = await importOriginal<typeof Widgets>();
  return {
    ...actual,
    createDefaultRegistry: vi.fn(() => ({})),
    createWidgetResolver: vi.fn((options: Parameters<typeof Widgets.createWidgetResolver>[0]) => {
      resolverCalls.push({ catalogs: options.catalogs, policy: options.policy });
      return actual.createWidgetResolver(options);
    }),
  };
});

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
  } as unknown as LoadedPackage['workflow'],
  rewards: null,
  cards: null,
  nodes: [
    {
      path: '/test/course/nodes/lesson-01.md',
      relativePath: 'nodes/lesson-01.md',
      content: '# Lesson 1',
      node: { type: 'lesson', title: 'Lesson 1' } as LoadedPackage['nodes'][number]['node'],
    },
  ],
  assetPaths: [],
};

const LOCAL_REGISTRY = 'http://localhost:4001';
const CATALOG = {
  registryId: 'local',
  origin: LOCAL_REGISTRY,
  widgets: [
    {
      id: 'community.example.counter',
      version: '1.0.0',
      manifestUrl: `${LOCAL_REGISTRY}/widget-registry/localpub/community.example.counter/1.0.0/manifest.json`,
      status: 'experimental',
      trustTier: 'sandboxed',
      offline: true,
    },
  ],
};

describe('CourseRuntime widget catalog auto-discovery', () => {
  beforeEach(() => {
    resolverCalls.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (globalThis as { __OPEN_EDU_WIDGET_CATALOG_URL__?: string })
      .__OPEN_EDU_WIDGET_CATALOG_URL__;
  });

  async function renderWithLocalCatalog(): Promise<void> {
    (globalThis as { __OPEN_EDU_WIDGET_CATALOG_URL__?: string }).__OPEN_EDU_WIDGET_CATALOG_URL__ =
      `${LOCAL_REGISTRY}/widget-registry/catalog.json`;
    vi.resetModules();
    const { CourseRuntime } = await import('./CourseRuntime');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(CATALOG), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    render(
      <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
        <CourseRuntime pkg={samplePackage} onBackToCatalog={vi.fn()} />
      </I18nProvider>,
    );
  }

  it('registers a locally served catalog under its registryId and the local/localdev aliases', async () => {
    await renderWithLocalCatalog();
    await waitFor(() => {
      expect(resolverCalls.length).toBeGreaterThan(0);
    });
    const { catalogs } = resolverCalls[resolverCalls.length - 1] as {
      catalogs: Record<string, { registryId: string }>;
    };
    expect(catalogs['local']).toBeDefined();
    expect(catalogs['local']?.registryId).toBe('local');
    expect(catalogs['localdev']).toBeDefined();
    expect(catalogs['localdev']?.registryId).toBe('local');
    expect(catalogs['local']).toBe(catalogs['localdev']);
  });

  it('auto-adds the locally served catalog origin to the resolver policy', async () => {
    await renderWithLocalCatalog();
    await waitFor(() => {
      expect(resolverCalls.length).toBeGreaterThan(0);
    });
    const { policy } = resolverCalls[resolverCalls.length - 1] as {
      policy: { registryCatalogOrigins: string[] };
    };
    expect(policy.registryCatalogOrigins).toContain(LOCAL_REGISTRY);
  });
});
