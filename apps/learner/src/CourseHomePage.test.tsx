import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseHomePage } from './CourseHomePage';
import type { LoadedPackage } from '@open-edu/core';
import type { ContentNode } from '@open-edu/schemas';
import type { ProgressSnapshot } from '@open-edu/schemas';

vi.mock('@open-edu/runtime', () => ({
  SideNav: ({ courseTitle, children }: { courseTitle: string; children: React.ReactNode }) => (
    <div data-testid="side-nav">
      <h3>{courseTitle}</h3>
      {children}
    </div>
  ),
  TopAppBar: () => <div data-testid="top-app-bar" />,
  CourseTree: () => <div data-testid="course-tree" />,
  AICallout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="ai-callout">
      <h3>{title}</h3>
      {children}
    </div>
  ),
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
    {
      path: '/test/course/nodes/lesson-02.md',
      relativePath: 'nodes/lesson-02.md',
      content: '# Lesson 2',
      node: { type: 'lesson', title: 'Lesson 2' } as unknown as ContentNode,
    },
  ],
  assetPaths: [],
};

describe('CourseHomePage', () => {
  it('renders course title', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getAllByText('Test Course')).toHaveLength(2);
  });

  it('renders SideNav', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('side-nav')).toBeInTheDocument();
  });

  it('renders TopAppBar', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
  });

  it('renders progress section with 0% when no progress', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 of 2 lessons')).toBeInTheDocument();
  });

  it('renders AI callout', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('ai-callout')).toBeInTheDocument();
  });

  it('renders Your Path section', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Your Path')).toBeInTheDocument();
  });

  it('renders Current Modules section', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Current Modules')).toBeInTheDocument();
  });

  it('shows Continue Learning button when progress has currentNodeId', () => {
    const progress: ProgressSnapshot = {
      packageId: 'test-course',
      packageVersion: '1.0.0',
      currentNodeId: 'nodes/lesson-02.md',
      visitedNodes: ['nodes/lesson-01.md'],
      scores: {},
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };
    mockGetProgress.mockReturnValue(progress);
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByText('Continue Learning')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 lessons')).toBeInTheDocument();
  });
});
