import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogPage } from './CatalogPage';
import type { PackageSummary } from '@open-edu/core';

const mockScanPackages = vi.fn();

vi.mock('@open-edu/core', () => ({
  scanPackages: (...args: unknown[]) => mockScanPackages(...args),
}));

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => ({})),
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
  },
];

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders course cards', () => {
    mockScanPackages.mockReturnValue(samplePackages);
    render(<CatalogPage packageDir="/test" onStartCourse={vi.fn()} />);
    const cards = screen.getAllByTestId('course-card');
    expect(cards).toHaveLength(2);
  });

  it('renders empty state when no packages', () => {
    mockScanPackages.mockReturnValue([]);
    render(<CatalogPage packageDir="/test" onStartCourse={vi.fn()} />);
    expect(screen.getByText('No courses found.')).toBeInTheDocument();
  });

  it('renders package titles', () => {
    mockScanPackages.mockReturnValue(samplePackages);
    render(<CatalogPage packageDir="/test" onStartCourse={vi.fn()} />);
    expect(screen.getByText('Course One')).toBeInTheDocument();
    expect(screen.getByText('Course Two')).toBeInTheDocument();
  });

  it('fires onStartCourse with correct packageDir', () => {
    mockScanPackages.mockReturnValue(samplePackages);
    const onStart = vi.fn();
    render(<CatalogPage packageDir="/test/courses" onStartCourse={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /Start Course One/ }));
    expect(onStart).toHaveBeenCalledWith('/test/courses');
  });
});
