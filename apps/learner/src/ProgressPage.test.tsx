import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressPage } from './ProgressPage';
import type { LoadedPackage } from '@open-edu/core';

vi.mock('@open-edu/runtime', () => ({
  SideNav: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="side-nav">{children}</div>
  ),
  TopAppBar: () => <div data-testid="top-app-bar" />,
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
});
