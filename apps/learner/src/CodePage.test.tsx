import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodePage } from './CodePage';
import type { LoadedPackage } from '@open-edu/core';
import type { ContentNode } from '@open-edu/schemas';

vi.mock('@open-edu/runtime', () => ({
  SideNav: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="side-nav">{children}</div>
  ),
  TopAppBar: () => <div data-testid="top-app-bar" />,
  CourseTree: () => <div data-testid="course-tree" />,
  NodeRenderer: ({ node }: { node: { node?: { title?: string } } }) => (
    <div data-testid="node-renderer">{node?.node?.title ?? 'no node'}</div>
  ),
  AITutorPanel: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="ai-tutor-panel" /> : null,
}));

const samplePackage: LoadedPackage = {
  rootDir: '/test/course',
  manifest: {
    id: 'test-course',
    title: 'Test Course',
    version: '1.0.0',
    author: 'Test Author',
    entry: 'nodes/code-01.md',
  },
  workflow: null,
  rewards: null,
  nodes: [
    {
      path: '/test/course/nodes/code-01.md',
      relativePath: 'nodes/code-01.md',
      content: '# Code Lesson',
      node: { type: 'lesson', title: 'Code Lesson' } as unknown as ContentNode,
    },
  ],
  assetPaths: [],
};

describe('CodePage', () => {
  it('renders SideNav', () => {
    render(<CodePage pkg={samplePackage} nodeId="nodes/code-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('side-nav')).toBeInTheDocument();
  });

  it('renders TopAppBar', () => {
    render(<CodePage pkg={samplePackage} nodeId="nodes/code-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
  });

  it('renders NodeRenderer', () => {
    render(<CodePage pkg={samplePackage} nodeId="nodes/code-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('node-renderer')).toBeInTheDocument();
    expect(screen.getByText('Code Lesson')).toBeInTheDocument();
  });

  it('renders AITutorPanel', () => {
    render(<CodePage pkg={samplePackage} nodeId="nodes/code-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('ai-tutor-panel')).toBeInTheDocument();
  });

  it('shows not found for invalid nodeId', () => {
    render(<CodePage pkg={samplePackage} nodeId="nodes/invalid.md" onNavigate={vi.fn()} />);
    expect(screen.getByText(/Lesson not found/)).toBeInTheDocument();
  });

  it('renders zoom and font-size toolbar buttons', () => {
    render(<CodePage pkg={samplePackage} nodeId="nodes/code-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Increase font size')).toBeInTheDocument();
    expect(screen.getAllByText('100%')).toHaveLength(2);
  });
});
