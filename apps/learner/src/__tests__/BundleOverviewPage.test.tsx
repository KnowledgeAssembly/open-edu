import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { BundleOverviewPage } from '../BundleOverviewPage';
import type { LoadedBundle } from '@open-edu/core';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

vi.mock('./cardsStorage.js', () => ({
  getAllCardProgress: vi.fn().mockResolvedValue({}),
  saveCardProgress: vi.fn().mockResolvedValue(undefined),
  getCardProgress: vi.fn().mockResolvedValue(null),
  clearCardProgress: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@open-edu/runtime', () => ({
  BundleOverview: ({ bundleTitle }: { bundleTitle: string }) => <div data-testid="bundle-overview">{bundleTitle}</div>,
  KnowledgeCardGrid: ({ cards }: { cards: Array<{ card: { title: string; summary: string } }> }) => (
    <div data-testid="card-grid">
      {cards.map((item) => (
        <div key={item.card.title}>{item.card.title}</div>
      ))}
    </div>
  ),
  KnowledgeCardViewer: () => null,
}));

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

const sampleBundle: LoadedBundle = {
  rootDir: '/test/bundle',
  manifest: {
    id: 'test-bundle',
    type: 'bundle',
    title: 'Test Bundle',
    version: '1.0.0',
    author: 'Test Author',
    modules: [
      { id: 'mod-a', title: 'Module A', path: './modules/mod-a', dependsOn: [] },
    ],
  },
  modules: [
    {
      rootDir: '/test/bundle/modules/mod-a',
      manifest: { id: 'mod-a', title: 'Module A', version: '1.0.0', author: 'Test', entry: 'nodes/a.md' },
      workflow: null,
      rewards: null,
      cards: null,
      nodes: [],
      assetPaths: [],
    },
  ],
  moduleMap: new Map(),
  rewards: null,
    cards: {
      cards: [
        {
          id: 'bundle-finisher',
          title: 'Bundle Finisher',
          category: 'Achievement',
          type: 'achievement',
          level: 1,
          maximumLevel: 1,
          summary: 'Finished all modules',
          unlock: { type: 'bundleCompleted' },
        },
      ],
    },
};

describe('BundleOverviewPage', () => {
  it('renders the bundle-level card shelf with bundle cards', () => {
    renderWithI18n(
      <BundleOverviewPage
        bundle={sampleBundle}
        bundleProgress={null}
        onStartModule={vi.fn()}
        onBackToCatalog={vi.fn()}
      />,
    );
    expect(screen.getByText('Bundle rewards')).toBeInTheDocument();
    expect(screen.getByText('Bundle Finisher')).toBeInTheDocument();
  });

  it('omits the bundle card shelf when the bundle has no cards', () => {
    renderWithI18n(
      <BundleOverviewPage
        bundle={{ ...sampleBundle, cards: null }}
        bundleProgress={null}
        onStartModule={vi.fn()}
        onBackToCatalog={vi.fn()}
      />,
    );
    expect(screen.queryByText('Bundle rewards')).not.toBeInTheDocument();
  });
});
