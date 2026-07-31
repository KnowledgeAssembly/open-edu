import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressDashboard } from './ProgressDashboard';
import type { LoadedPackage } from '@open-edu/core';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

const { getAllProgressMock } = vi.hoisted(() => ({
  getAllProgressMock: vi.fn().mockResolvedValue({}),
}));

vi.mock('./progressStorage', () => ({
  getAllProgress: getAllProgressMock,
}));

vi.mock('./badgesStorage', () => ({
  getAllBadges: vi.fn(() => Promise.resolve({})),
}));

describe('ProgressDashboard', () => {
  it('shows empty state when no progress exists', () => {
    getAllProgressMock.mockResolvedValue({});
    renderWithProvider(<ProgressDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText('Your learning journey starts here!')).toBeInTheDocument();
    expect(screen.getByText('Browse Courses')).toBeInTheDocument();
  });

  it('renders the heading', () => {
    getAllProgressMock.mockResolvedValue({});
    renderWithProvider(<ProgressDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText('My Progress')).toBeInTheDocument();
  });

  it('resolves title and navigates for bundle module progress', async () => {
    getAllProgressMock.mockResolvedValue({
      'module-a': {
        packageId: 'module-a',
        packageVersion: '1.0.0',
        currentNodeId: 'nodes/mod-a-1.md',
        visitedNodes: ['nodes/mod-a-1.md'],
        scores: {},
        isCompleted: false,
        updatedAt: '2025-01-02T00:00:00Z',
      },
    });

    const modulePackage: LoadedPackage = {
      rootDir: 'oep://bundle-1/module-a',
      manifest: {
        id: 'module-a',
        title: 'Module A',
        version: '1.0.0',
        author: 'Author',
        entry: 'nodes/mod-a-1.md',
      },
      workflow: {
        routing: {
          'nodes/mod-a-1.md': { onComplete: 'nodes/mod-a-2.md' },
          'nodes/mod-a-2.md': { onComplete: 'nodes/mod-a-2.md' },
        },
      },
      rewards: null,
      cards: null,
      nodes: [
        {
          path: 'oep://bundle-1/module-a/nodes/mod-a-1.md',
          relativePath: 'nodes/mod-a-1.md',
          content: '# Module A Lesson 1',
          node: { type: 'lesson', title: 'Module A Lesson 1' },
        },
        {
          path: 'oep://bundle-1/module-a/nodes/mod-a-2.md',
          relativePath: 'nodes/mod-a-2.md',
          content: '# Module A Lesson 2',
          node: { type: 'lesson', title: 'Module A Lesson 2' },
        },
      ],
      assetPaths: [],
      assetMap: new Map(),
    };

    const onNavigate = vi.fn();
    renderWithProvider(
      <ProgressDashboard onNavigate={onNavigate} packageEntries={{ 'module-a': modulePackage }} />,
    );

    expect(await screen.findByText('Module A')).toBeInTheDocument();
    expect(screen.getByText(/Last: Module A Lesson 1/)).toBeInTheDocument();

    const continueButton = screen.getByRole('button', { name: /continue/i });
    continueButton.click();

    expect(onNavigate).toHaveBeenCalledWith({ view: 'course', packageId: 'module-a' });
  });
});
