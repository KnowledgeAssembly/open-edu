import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CatalogPage } from './CatalogPage';
import type { PackageSummary } from '@open-edu/core';

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
    render(<CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />);
    const cards = screen.getAllByTestId('course-card');
    expect(cards).toHaveLength(2);
  });

  it('renders empty state when no packages', () => {
    render(<CatalogPage packages={[]} onStartCourse={vi.fn()} />);
    expect(screen.getByText('No courses yet')).toBeInTheDocument();
  });

  it('renders package titles', () => {
    render(<CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />);
    expect(screen.getByText('Course One')).toBeInTheDocument();
    expect(screen.getByText('Course Two')).toBeInTheDocument();
  });

  it('fires onStartCourse with correct rootDir per package', () => {
    const onStart = vi.fn();
    render(<CatalogPage packages={samplePackages} onStartCourse={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /Start Course One/ }));
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
      render(<CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('1 in progress')).toBeInTheDocument();
      });
    });

    it('shows "View all →" button that navigates to progress', async () => {
      const onNavigate = vi.fn();
      render(
        <CatalogPage packages={samplePackages} onStartCourse={vi.fn()} onNavigate={onNavigate} />,
      );
      const viewAll = await screen.findByText('View all →');
      expect(viewAll).toBeInTheDocument();
      fireEvent.click(viewAll);
      expect(onNavigate).toHaveBeenCalledWith({ view: 'progress' });
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
      const { container } = render(
        <CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />,
      );
      const svgs = container.querySelectorAll('[data-testid="course-card"] svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('shows "Completed" text on completed course', async () => {
      render(<CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });
  });
});
