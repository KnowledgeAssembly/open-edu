import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LoadedNode } from '@open-edu/core';

vi.mock('../context/RuntimeContext', () => ({
  useRuntime: () => ({
    loadedPackage: {
      manifest: { title: 'Test Course' },
      nodes: [],
    },
    currentNodeId: 'node-2',
    visitedNodes: ['node-1', 'node-2'],
    isCompleted: false,
  }),
}));

import { Sidebar } from './Sidebar';

function makeNode(relativePath: string, title?: string): LoadedNode {
  return {
    path: `/tmp/${relativePath}`,
    relativePath,
    content: '',
    node: { type: 'lesson' as const, ...(title ? { title } : {}) } as LoadedNode['node'],
  };
}

describe('Sidebar', () => {
  it('renders all nodes as list items', () => {
    const nodes = [makeNode('node-1', 'Lesson 1'), makeNode('node-2', 'Lesson 2')];
    render(<Sidebar nodes={nodes} />);
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    expect(screen.getByText('Lesson 2')).toBeInTheDocument();
  });

  it('highlights current node with aria-current', () => {
    const nodes = [makeNode('node-1'), makeNode('node-2')];
    render(<Sidebar nodes={nodes} />);
    expect(screen.getByTestId('sidebar-node-node-2')).toHaveAttribute('aria-current', 'step');
  });

  it('shows correct visited/not-visited icons', () => {
    const nodes = [makeNode('node-1'), makeNode('node-2'), makeNode('node-3')];
    render(<Sidebar nodes={nodes} />);
    const node1 = screen.getByTestId('sidebar-node-node-1');
    const node3 = screen.getByTestId('sidebar-node-node-3');
    expect(node1.textContent).toContain('\u25CF');
    expect(node3.textContent).toContain('\u25CB');
  });

  it('shows X of Y count at bottom', () => {
    const nodes = [makeNode('node-1'), makeNode('node-2')];
    render(<Sidebar nodes={nodes} />);
    expect(screen.getByText(/2 of 2 complete/)).toBeInTheDocument();
  });

  it('handles empty nodes array', () => {
    render(<Sidebar nodes={[]} />);
    expect(screen.getByText('No lessons')).toBeInTheDocument();
  });
});
