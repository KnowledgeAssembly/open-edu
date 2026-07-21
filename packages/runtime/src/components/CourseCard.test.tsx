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
    expect(screen.getByText(/Test Author/)).toBeInTheDocument();
  });

  it('is clickable and fires onStart on click', () => {
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
    const card = screen.getByTestId('course-card');
    expect(card).toHaveClass('cursor-pointer');
    fireEvent.click(card);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('shows progress bar when in progress', () => {
    const progress: ProgressSnapshot = {
      packageId: 'test',
      packageVersion: '1.0.0',
      currentNodeId: 'nodes/lesson-02.md',
      visitedNodes: ['nodes/lesson-01.md'],
      scores: {},
      answers: {},
      isCompleted: false,
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    const { container } = render(
      <CourseCard
        manifest={manifest}
        nodeCount={5}
        badgeCount={0}
        earnedBadgeCount={0}
        progress={progress}
        onStart={vi.fn()}
      />,
    );
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('shows completed text when completed', () => {
    const progress: ProgressSnapshot = {
      packageId: 'test',
      packageVersion: '1.0.0',
      currentNodeId: 'nodes/lesson-05.md',
      visitedNodes: ['nodes/lesson-01.md', 'nodes/lesson-02.md'],
      scores: {},
      answers: {},
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
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
