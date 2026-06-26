import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressPage } from './ProgressPage';
import type { LoadedPackage } from '@open-edu/core';
import type { ContentNode, ProgressSnapshot } from '@open-edu/schemas';

vi.mock('@open-edu/runtime', () => ({
  SideNav: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="side-nav">{children}</div>
  ),
  TopAppBar: () => <div data-testid="top-app-bar" />,
}));

const mockGetProgress = vi.hoisted(() =>
  vi.fn<[packageId: string], ProgressSnapshot | null>(() => null),
);
vi.mock('./progressStorage', () => ({
  getProgress: mockGetProgress,
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
  workflow: null,
  rewards: null,
  nodes: [
    {
      path: '/test/course/nodes/lesson-01.md',
      relativePath: 'nodes/lesson-01.md',
      content: '# Lesson 1',
      node: { type: 'lesson', title: 'Lesson 1' } as unknown as ContentNode,
    },
  ],
  assetPaths: [],
};

describe('ProgressPage', () => {
  it('renders dashboard title', () => {
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('My Progress')).toBeInTheDocument();
  });

  it('renders SideNav', () => {
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('side-nav')).toBeInTheDocument();
  });

  it('renders TopAppBar', () => {
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
  });

  it('renders Course Completion card', () => {
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Course Completion')).toBeInTheDocument();
  });

  it('renders AI Insights card', () => {
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
  });

  it('renders Mastery Profile card', () => {
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Mastery Profile')).toBeInTheDocument();
  });

  it('renders Recent Activity section', () => {
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Recent Activity & Scores')).toBeInTheDocument();
  });

  it('shows recent activity and scores when progress exists', () => {
    const progress: ProgressSnapshot = {
      packageId: 'test-course',
      packageVersion: '1.0.0',
      currentNodeId: 'nodes/lesson-01.md',
      visitedNodes: ['nodes/lesson-01.md'],
      scores: { 'nodes/lesson-01.md': 85 },
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };
    mockGetProgress.mockReturnValue(progress);
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    expect(screen.getByText('85/100')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText(/100\s*%/)).toBeInTheDocument();
  });

  it('shows Continue Learning button when progress has currentNodeId', () => {
    const progress: ProgressSnapshot = {
      packageId: 'test-course',
      packageVersion: '1.0.0',
      currentNodeId: 'nodes/lesson-01.md',
      visitedNodes: ['nodes/lesson-01.md'],
      scores: {},
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };
    mockGetProgress.mockReturnValue(progress);
    render(<ProgressPage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Continue Learning')).toBeInTheDocument();
  });
});
