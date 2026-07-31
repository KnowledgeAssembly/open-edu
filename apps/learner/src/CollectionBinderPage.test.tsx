import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { CollectionBinderPage } from './CollectionBinderPage';
import type { LoadedPackage } from '@open-edu/core';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

vi.mock('./cardsStorage.js', () => ({
  getAllCardProgress: vi.fn().mockResolvedValue({}),
  saveCardProgress: vi.fn().mockResolvedValue(undefined),
  getCardProgress: vi.fn().mockResolvedValue(null),
  clearCardProgress: vi.fn().mockResolvedValue(undefined),
}));

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

const sampleModuleCard = {
  id: 'module-card',
  title: 'Module Card',
  category: 'Science',
  type: 'knowledge',
  summary: 'A module card summary',
  unlock: { type: 'chain', completedNodeIds: ['nodes/lesson-01.md'] },
};

const sampleBundleCard = {
  id: 'bundle-card',
  title: 'Bundle Card',
  category: 'Achievement',
  type: 'achievement',
  summary: 'Finished every module',
  unlock: { type: 'bundleCompleted' },
};

const samplePackage: LoadedPackage = {
  rootDir: '/test/course',
  manifest: {
    id: 'test-course',
    title: 'Test Course',
    version: '1.0.0',
    author: 'Test Author',
    entry: 'nodes/lesson-01.md',
  },
  workflow: null,
  rewards: null,
  cards: { cards: [sampleModuleCard] as any },
  nodes: [],
  assetPaths: [],
};

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('CollectionBinderPage', () => {
  it('renders bundle-scoped cards with a bundle label', () => {
    renderWithI18n(
      <CollectionBinderPage
        packages={{ 'test-course': samplePackage }}
        bundleCards={[sampleBundleCard as any]}
      />,
    );
    expect(screen.getByText('Bundle rewards')).toBeInTheDocument();
    expect(screen.getByText('Bundle Card')).toBeInTheDocument();
    expect(screen.getByText('Module Card')).toBeInTheDocument();
  });

  it('renders empty state when no cards exist', () => {
    renderWithI18n(<CollectionBinderPage packages={{}} />);
    expect(screen.getByText('No cards yet. Complete lessons to unlock your first Knowledge Card.')).toBeInTheDocument();
  });
});
