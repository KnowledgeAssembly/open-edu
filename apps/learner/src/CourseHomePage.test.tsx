import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseHomePage } from './CourseHomePage';
import type { LoadedPackage } from '@open-edu/core';

vi.mock('@open-edu/runtime', () => ({
  SideNav: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="side-nav">{children}</div>
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

vi.mock('./progressStorage', () => ({
  getProgress: vi.fn(() => null),
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
      node: { type: 'lesson', title: 'Lesson 1' },
    } as any,
    {
      path: '/test/course/nodes/lesson-02.md',
      relativePath: 'nodes/lesson-02.md',
      content: '# Lesson 2',
      node: { type: 'lesson', title: 'Lesson 2' },
    } as any,
  ],
  assetPaths: [],
};

describe('CourseHomePage', () => {
  it('renders course title', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getAllByText('Test Course').length).toBeGreaterThan(0);
  });

  it('renders SideNav', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('side-nav')).toBeInTheDocument();
  });

  it('renders TopAppBar', () => {
    render(<CourseHomePage pkg={samplePackage} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
  });

  it('renders progress section', () => {
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
});
