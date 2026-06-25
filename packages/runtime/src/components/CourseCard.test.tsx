import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseCard } from './CourseCard';
import type { PackageManifest, ProgressSnapshot } from '@open-edu/schemas';

const manifest: PackageManifest = {
  id: 'test-course',
  title: 'Test Course',
  version: '1.0.0',
  author: 'Test Author',
  entry: 'nodes/lesson-01.md',
};

describe('CourseCard', () => {
  it('renders title and author from manifest', () => {
    render(
      <CourseCard
        manifest={manifest}
        nodeCount={5}
        badgeCount={0}
        earnedBadgeCount={0}
        progress={null}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('shows "Start" button when no progress', () => {
    render(
      <CourseCard
        manifest={manifest}
        nodeCount={5}
        badgeCount={0}
        earnedBadgeCount={0}
        progress={null}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Start/ })).toBeInTheDocument();
  });

  it('shows "Continue" button when in progress', () => {
    const progress: ProgressSnapshot = {
      packageId: 'test',
      packageVersion: '1.0.0',
      currentNodeId: 'nodes/lesson-02.md',
      visitedNodes: ['nodes/lesson-01.md'],
      scores: {},
      isCompleted: false,
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    render(
      <CourseCard
        manifest={manifest}
        nodeCount={5}
        badgeCount={0}
        earnedBadgeCount={0}
        progress={progress}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Continue/ })).toBeInTheDocument();
  });

  it('shows "Completed" disabled button when completed', () => {
    const progress: ProgressSnapshot = {
      packageId: 'test',
      packageVersion: '1.0.0',
      currentNodeId: 'nodes/lesson-05.md',
      visitedNodes: ['nodes/lesson-01.md', 'nodes/lesson-02.md'],
      scores: {},
      isCompleted: true,
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    render(
      <CourseCard
        manifest={manifest}
        nodeCount={5}
        badgeCount={0}
        earnedBadgeCount={0}
        progress={progress}
        onStart={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: /Completed/ });
    expect(button).toBeDisabled();
  });

  it('fires onStart with entry on click', () => {
    const onStart = vi.fn();
    render(
      <CourseCard
        manifest={manifest}
        nodeCount={5}
        badgeCount={0}
        earnedBadgeCount={0}
        progress={null}
        onStart={onStart}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Start/ }));
    expect(onStart).toHaveBeenCalledWith('nodes/lesson-01.md');
  });
});
