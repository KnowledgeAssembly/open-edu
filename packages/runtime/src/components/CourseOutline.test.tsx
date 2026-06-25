import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../context/RuntimeContext', () => ({
  useRuntime: () => ({
    loadedPackage: {
      manifest: { title: 'Test Course' },
      nodes: [
        { relativePath: 'node-1', path: '/tmp/node-1', content: '', node: { type: 'lesson' } },
        { relativePath: 'node-2', path: '/tmp/node-2', content: '', node: { type: 'lesson' } },
      ],
    },
    currentNodeId: 'node-1',
    visitedNodes: ['node-1'],
    isCompleted: false,
  }),
}));

vi.mock('../layout/Sidebar', () => ({
  Sidebar: ({ nodes }: { nodes: unknown[] }) => (
    <div data-testid="sidebar-mock">{nodes.length} nodes</div>
  ),
}));

import { CourseOutline } from './CourseOutline';

describe('CourseOutline', () => {
  it('renders sidebar + summary text', () => {
    render(<CourseOutline />);
    expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 complete/)).toBeInTheDocument();
  });

  it('toggles open/closed on button click', () => {
    render(<CourseOutline />);
    expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('outline-toggle'));
    expect(screen.queryByTestId('sidebar-mock')).toBeNull();
  });
});
