import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseTree } from '../../layout/CourseTree.js';
import type { CourseTreeModule } from '../../layout/CourseTree.js';

const sampleModules: CourseTreeModule[] = [
  {
    title: 'Module 1: Basics',
    lessons: [
      { id: 'intro', title: 'Introduction', isActive: true },
      { id: 'setup', title: 'Setup Guide' },
    ],
  },
  {
    title: 'Module 2: Advanced',
    lessons: [
      { id: 'deep-dive', title: 'Deep Dive' },
      { id: 'practice', title: 'Practice' },
    ],
    isLocked: true,
  },
];

describe('CourseTree', () => {
  it('renders all module titles', () => {
    render(<CourseTree modules={sampleModules} />);
    expect(screen.getByText('Module 1: Basics')).toBeInTheDocument();
    expect(screen.getByText('Module 2: Advanced')).toBeInTheDocument();
  });

  it('shows lessons for expanded (first unlocked) module', () => {
    render(<CourseTree modules={sampleModules} />);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Setup Guide')).toBeInTheDocument();
  });

  it('hides lessons for collapsed module', () => {
    render(<CourseTree modules={sampleModules} />);
    expect(screen.queryByText('Deep Dive')).toBeNull();
  });

  it('shows lock icon for locked module', () => {
    render(<CourseTree modules={sampleModules} />);
    const lockedModule = screen.getByTestId('course-tree-module-1');
    expect(lockedModule.textContent).toContain('\uD83D\uDD12');
  });

  it('clicks on lesson triggers onLessonClick', () => {
    const onLessonClick = vi.fn();
    render(<CourseTree modules={sampleModules} onLessonClick={onLessonClick} />);
    fireEvent.click(screen.getByTestId('course-tree-lesson-intro'));
    expect(onLessonClick).toHaveBeenCalledWith('intro');
  });

  it('active lesson has aria-current="page"', () => {
    render(<CourseTree modules={sampleModules} />);
    const activeLesson = screen.getByTestId('course-tree-lesson-intro');
    expect(activeLesson.getAttribute('aria-current')).toBe('page');
  });

  it('inactive lesson does not have aria-current', () => {
    render(<CourseTree modules={sampleModules} />);
    const inactiveLesson = screen.getByTestId('course-tree-lesson-setup');
    expect(inactiveLesson.getAttribute('aria-current')).toBeNull();
  });

  it('module header has aria-expanded', () => {
    render(<CourseTree modules={sampleModules} />);
    const moduleHeader = screen.getByText('Module 1: Basics').closest('button');
    expect(moduleHeader?.getAttribute('aria-expanded')).toBe('true');
  });

  it('locked module lessons not shown when collapsed', () => {
    render(<CourseTree modules={sampleModules} />);
    expect(screen.queryByTestId('course-tree-lesson-deep-dive')).toBeNull();
  });

  it('clicking module toggles lesson visibility', () => {
    render(<CourseTree modules={sampleModules} />);
    const moduleBtn = screen.getByText('Module 1: Basics').closest('button')!;
    fireEvent.click(moduleBtn);
    expect(screen.queryByText('Introduction')).toBeNull();
    fireEvent.click(moduleBtn);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });
});
