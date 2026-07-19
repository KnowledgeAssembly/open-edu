import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DownloadedCourseList } from '../components/DownloadedCourseList';
import type { StoredCourse } from '@open-edu/storage';

const mockCourses: StoredCourse[] = [
  {
    id: 'course-1',
    version: '1.0.0',
    manifest: { title: 'Math 101' },
    nodes: [],
    assets: [],
    downloadedAt: '2026-07-20T10:00:00Z',
  },
  {
    id: 'course-2',
    version: '2.0.0',
    manifest: { title: 'Science 101' },
    nodes: [],
    assets: [],
    downloadedAt: '2026-07-19T08:00:00Z',
  },
];

describe('DownloadedCourseList', () => {
  it('shows empty state when no courses', () => {
    render(<DownloadedCourseList courses={[]} />);
    expect(screen.getByText('No downloaded courses yet.')).toBeInTheDocument();
  });

  it('lists downloaded courses', () => {
    render(<DownloadedCourseList courses={mockCourses} />);
    expect(screen.getByText('Math 101')).toBeInTheDocument();
    expect(screen.getByText('Science 101')).toBeInTheDocument();
    expect(screen.getByText(/Downloaded Courses \(2\)/)).toBeInTheDocument();
  });

  it('calls onDelete when remove button clicked', () => {
    const onDelete = vi.fn();
    render(<DownloadedCourseList courses={mockCourses} onDelete={onDelete} />);
    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith('course-1');
  });
});
