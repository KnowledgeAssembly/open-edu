import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CatalogPage } from './CatalogPage';
import type { PackageSummary } from '@open-edu/core';
import type { StoredCourse } from '@open-edu/storage';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

const { getAllProgressMock, getAllBadgesMock } = vi.hoisted(() => ({
  getAllProgressMock: vi.fn().mockResolvedValue({}),
  getAllBadgesMock: vi.fn().mockResolvedValue({}),
}));

vi.mock('./progressStorage', () => ({
  getAllProgress: getAllProgressMock,
}));

vi.mock('./badgesStorage', () => ({
  getAllBadges: getAllBadgesMock,
}));

vi.mock('@open-edu/pwa-core', () => ({
  getInstallState: vi.fn().mockReturnValue({
    isInstallable: false,
    isInstalled: false,
    platform: 'desktop',
  }),
  promptInstall: vi.fn().mockResolvedValue({ outcome: 'dismissed' }),
}));

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

const samplePackages: PackageSummary[] = [
  {
    manifest: {
      id: 'course-1',
      title: 'Course One',
      version: '1.0.0',
      author: 'Author One',
      entry: 'nodes/lesson-01.md',
    },
    nodeCount: 3,
    availableBadges: 1,
    rootDir: '/test/courses/course-1',
  },
  {
    manifest: {
      id: 'course-2',
      title: 'Course Two',
      version: '1.0.0',
      author: 'Author Two',
      entry: 'nodes/lesson-01.md',
    },
    nodeCount: 5,
    availableBadges: 2,
    rootDir: '/test/courses/course-2',
  },
];

describe('CatalogPage', () => {
  beforeEach(() => {
    getAllProgressMock.mockResolvedValue({});
    getAllBadgesMock.mockResolvedValue({});
  });

  it('renders course cards', () => {
    renderWithI18n(<CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />);
    const cards = screen.getAllByTestId('course-card');
    expect(cards).toHaveLength(2);
  });

  it('renders empty state when no packages', () => {
    renderWithI18n(<CatalogPage packages={[]} onStartCourse={vi.fn()} />);
    expect(screen.getByText('No courses yet')).toBeInTheDocument();
  });

  it('renders package titles', () => {
    renderWithI18n(<CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />);
    expect(screen.getByText('Course One')).toBeInTheDocument();
    expect(screen.getByText('Course Two')).toBeInTheDocument();
  });

  it('fires onStartCourse with correct rootDir per package', () => {
    const onStart = vi.fn();
    renderWithI18n(<CatalogPage packages={samplePackages} onStartCourse={onStart} />);
    const cards = screen.getAllByTestId('course-card');
    fireEvent.click(cards[0]!);
    expect(onStart).toHaveBeenCalledWith('/test/courses/course-1');
  });

  describe('continue learning shelf', () => {
    beforeEach(() => {
      getAllProgressMock.mockResolvedValue({
        'course-1': {
          packageId: 'course-1',
          packageVersion: '1.0.0',
          currentNodeId: 'lesson-2',
          visitedNodes: ['lesson-1', 'lesson-2'],
          scores: {},
          isCompleted: false,
          updatedAt: '2025-01-01T00:00:00Z',
        },
      });
    });

    it('shows in-progress count badge', async () => {
      renderWithI18n(<CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('1 in progress')).toBeInTheDocument();
      });
    });

    it('shows "View all →" button that navigates to progress', async () => {
      const onNavigate = vi.fn();
      renderWithI18n(
        <CatalogPage packages={samplePackages} onStartCourse={vi.fn()} onNavigate={onNavigate} />,
      );
      const viewAll = await screen.findByText('View all →');
      expect(viewAll).toBeInTheDocument();
      fireEvent.click(viewAll);
      expect(onNavigate).toHaveBeenCalledWith({ view: 'progress' });
    });

    it('includes in-progress bundle modules in the continue shelf', async () => {
      getAllProgressMock.mockResolvedValue({
        'course-1': {
          packageId: 'course-1',
          packageVersion: '1.0.0',
          currentNodeId: 'lesson-2',
          visitedNodes: ['lesson-1', 'lesson-2'],
          scores: {},
          isCompleted: false,
          updatedAt: '2025-01-01T00:00:00Z',
        },
        'module-a': {
          packageId: 'module-a',
          packageVersion: '1.0.0',
          currentNodeId: 'nodes/mod-a-2.md',
          visitedNodes: ['nodes/mod-a-1.md', 'nodes/mod-a-2.md'],
          scores: {},
          isCompleted: false,
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const modulePackages: PackageSummary[] = [
        {
          manifest: {
            id: 'module-a',
            title: 'Module A',
            version: '1.0.0',
            author: 'Author',
            entry: 'nodes/mod-a-1.md',
          },
          nodeCount: 3,
          availableBadges: 0,
          rootDir: 'oep://bundle-1/module-a',
        },
      ];

      renderWithI18n(
        <CatalogPage
          packages={samplePackages}
          modulePackages={modulePackages}
          onStartCourse={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('2 in progress')).toBeInTheDocument();
      });

      const shelf = screen.getByTestId('continue-learning-shelf');
      expect(shelf).toHaveTextContent('Module A');
      expect(shelf).toHaveTextContent('Course One');
    });
  });

  describe('completed course card', () => {
    beforeEach(() => {
      getAllProgressMock.mockResolvedValue({
        'course-1': {
          packageId: 'course-1',
          packageVersion: '1.0.0',
          currentNodeId: 'lesson-3',
          visitedNodes: ['lesson-1', 'lesson-2', 'lesson-3'],
          scores: {},
          isCompleted: true,
          updatedAt: '2025-01-01T00:00:00Z',
        },
      });
      getAllBadgesMock.mockResolvedValue({
        'course-1': ['badge-1'],
      });
    });

    it('shows OpenModule indicator on completed card', () => {
      const { container } = renderWithI18n(
        <CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />,
      );
      const svgs = container.querySelectorAll('[data-testid="course-card"] svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('shows "Completed" text on completed course', async () => {
      renderWithI18n(<CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });
  });

  describe('installed courses (OEP)', () => {
    const installedCourses: StoredCourse[] = [
      {
        id: 'oep-course-1',
        version: '1.0.0',
        manifest: {
          id: 'oep-course-1',
          title: 'OEP Course One',
          version: '1.0.0',
          author: 'Author',
          entry: 'nodes/intro.md',
        },
        nodes: [],
        assets: [],
        downloadedAt: '2026-07-27T00:00:00Z',
      },
    ];

    const oepPackages: PackageSummary[] = [
      {
        manifest: {
          id: 'oep-course-1',
          title: 'OEP Course One',
          version: '1.0.0',
          author: 'Author',
          entry: 'nodes/intro.md',
        },
        nodeCount: 0,
        availableBadges: 0,
        rootDir: 'oep://oep-course-1',
      },
    ];

    it('shows delete button on OEP course card', () => {
      renderWithI18n(
        <CatalogPage
          packages={[...samplePackages, ...oepPackages]}
          onStartCourse={vi.fn()}
          installedCourses={installedCourses}
        />,
      );
      expect(screen.getByTestId('delete-installed-button')).toBeInTheDocument();
    });

    it('does not show delete button on non-OEP courses', () => {
      renderWithI18n(
        <CatalogPage packages={samplePackages} onStartCourse={vi.fn()} installedCourses={[]} />,
      );
      expect(screen.queryByTestId('delete-installed-button')).not.toBeInTheDocument();
    });

    it('opens delete confirmation dialog when delete button is clicked', () => {
      renderWithI18n(
        <CatalogPage
          packages={[...samplePackages, ...oepPackages]}
          onStartCourse={vi.fn()}
          installedCourses={installedCourses}
        />,
      );
      fireEvent.click(screen.getByTestId('delete-installed-button'));
      expect(screen.getByText('Remove course?')).toBeInTheDocument();
      expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-cancel-button')).toBeInTheDocument();
    });

    it('cancels delete when cancel button is clicked', () => {
      renderWithI18n(
        <CatalogPage
          packages={[...samplePackages, ...oepPackages]}
          onStartCourse={vi.fn()}
          installedCourses={installedCourses}
        />,
      );
      fireEvent.click(screen.getByTestId('delete-installed-button'));
      expect(screen.getByText('Remove course?')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('delete-cancel-button'));
      expect(screen.queryByText('Remove course?')).not.toBeInTheDocument();
    });

    it('renders OEP course in the catalog grid', () => {
      renderWithI18n(
        <CatalogPage
          packages={[...samplePackages, ...oepPackages]}
          onStartCourse={vi.fn()}
          installedCourses={installedCourses}
        />,
      );
      const cards = screen.getAllByTestId('course-card');
      expect(cards).toHaveLength(3);
      expect(screen.getByText('OEP Course One')).toBeInTheDocument();
    });
  });
});
