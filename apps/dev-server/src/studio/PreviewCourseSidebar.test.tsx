import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import type { LoadedNode, LoadedPackage } from '@open-edu/core';
import { PreviewCourseSidebar } from './PreviewCourseSidebar';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

const nodes: LoadedNode[] = [
  {
    path: '/test/nodes/lesson-b.md',
    relativePath: 'nodes/lesson-b.md',
    content: '# B',
    node: { type: 'lesson', title: 'Lesson B' },
  },
  {
    path: '/test/nodes/lesson-a.md',
    relativePath: 'nodes/lesson-a.md',
    content: '# A',
    node: { type: 'lesson', title: 'Lesson A' },
  },
  {
    path: '/test/nodes/lesson-c.md',
    relativePath: 'nodes/lesson-c.md',
    content: '# C',
    node: { type: 'lesson', title: 'Lesson C' },
  },
];

const mockPackage: LoadedPackage = {
  rootDir: '/test',
  manifest: {
    id: 'test',
    title: 'Test',
    version: '1.0.0',
    author: 'Test',
    entry: 'nodes/lesson-a.md',
  },
  workflow: {
    routing: {
      'nodes/lesson-a.md': { onComplete: 'nodes/lesson-b.md' },
      'nodes/lesson-b.md': { onComplete: 'nodes/lesson-c.md' },
      'nodes/lesson-c.md': { onComplete: 'COMPLETED' },
    },
  },
  rewards: null,
  cards: null,
  nodes,
  assetPaths: [],
};

vi.mock('@open-edu/runtime', () => ({
  useRuntime: () => ({
    loadedPackage: mockPackage,
    currentNodeId: 'nodes/lesson-a.md',
    visitedNodes: ['nodes/lesson-a.md', 'nodes/lesson-b.md'],
    navigateToNode: mockNavigate,
  }),
}));

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider
      locale="en"
      dictionaries={{ en: { studio: studioEn as Record<string, string> } }}
    >
      {ui}
    </I18nProvider>
  );
}

describe('PreviewCourseSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders steps in workflow order, not node array order', () => {
    render(wrap(<PreviewCourseSidebar />));
    const list = screen.getByRole('list', { name: 'Course steps' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByText('Lesson A')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Lesson B')).toBeInTheDocument();
    expect(within(items[2]!).getByText('Lesson C')).toBeInTheDocument();
  });

  it('marks the current step, completed steps, and disables future steps', () => {
    render(wrap(<PreviewCourseSidebar />));
    const current = screen.getByTestId('step-nodes/lesson-a.md');
    expect(current).toHaveAttribute('aria-current', 'step');
    const completed = screen.getByTestId('step-nodes/lesson-b.md');
    expect(completed).not.toHaveAttribute('aria-current');
    expect(completed).toHaveAttribute('aria-label', expect.stringContaining('(completed)'));
    const future = screen.getByTestId('step-nodes/lesson-c.md');
    expect(future).toBeDisabled();
  });

  it('navigates when a completed step is clicked', async () => {
    render(wrap(<PreviewCourseSidebar />));
    await userEvent.click(screen.getByTestId('step-nodes/lesson-b.md'));
    expect(mockNavigate).toHaveBeenCalledWith('nodes/lesson-b.md');
  });

  it('renders the course title in the sidebar header', () => {
    render(wrap(<PreviewCourseSidebar />));
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
