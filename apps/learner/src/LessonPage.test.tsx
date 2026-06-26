import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonPage } from './LessonPage';
import type { LoadedPackage } from '@open-edu/core';

vi.mock('@open-edu/runtime', () => ({
  SideNav: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="side-nav">{children}</div>
  ),
  TopAppBar: () => <div data-testid="top-app-bar" />,
  CourseTree: () => <div data-testid="course-tree" />,
  NodeRenderer: ({ node }: any) => (
    <div data-testid="node-renderer">{node?.node?.title ?? 'no node'}</div>
  ),
  AITutorPanel: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="ai-tutor-panel" /> : null,
  ReadingRuler: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="reading-ruler" /> : null,
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

describe('LessonPage', () => {
  it('renders SideNav', () => {
    render(<LessonPage pkg={samplePackage} nodeId="nodes/lesson-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('side-nav')).toBeInTheDocument();
  });

  it('renders TopAppBar', () => {
    render(<LessonPage pkg={samplePackage} nodeId="nodes/lesson-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
  });

  it('renders NodeRenderer with current node', () => {
    render(<LessonPage pkg={samplePackage} nodeId="nodes/lesson-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('node-renderer')).toBeInTheDocument();
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
  });

  it('renders AITutorPanel', () => {
    render(<LessonPage pkg={samplePackage} nodeId="nodes/lesson-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('ai-tutor-panel')).toBeInTheDocument();
  });

  it('shows lesson not found for invalid nodeId', () => {
    render(<LessonPage pkg={samplePackage} nodeId="nodes/invalid.md" onNavigate={vi.fn()} />);
    expect(screen.getByText(/Lesson not found/)).toBeInTheDocument();
  });
});
