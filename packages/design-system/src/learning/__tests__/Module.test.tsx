import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Module } from '../Module.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

const sampleLessons = [
  { id: 'intro', title: 'Introduction', isActive: true },
  { id: 'setup', title: 'Setup Guide' },
];

describe('Module', () => {
  it('renders module title', () => {
    render(<Module title="Module 1" lessons={sampleLessons} />);
    expect(screen.getByText('Module 1')).toBeInTheDocument();
  });

  it('shows lesson titles when expanded', () => {
    render(<Module title="Module 1" lessons={sampleLessons} />);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Setup Guide')).toBeInTheDocument();
  });

  it('clicking module title toggles lesson visibility', () => {
    render(<Module title="Module 1" lessons={sampleLessons} />);
    const header = screen.getByText('Module 1');
    fireEvent.click(header);
    expect(screen.queryByText('Introduction')).toBeNull();
    fireEvent.click(header);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  it('clicking lesson calls onLessonClick', () => {
    const onLessonClick = vi.fn();
    render(<Module title="Module 1" lessons={sampleLessons} onLessonClick={onLessonClick} />);
    fireEvent.click(screen.getByTestId('module-lesson-intro'));
    expect(onLessonClick).toHaveBeenCalledWith('intro');
  });

  it('shows active lesson with aria-current="page"', () => {
    render(<Module title="Module 1" lessons={sampleLessons} />);
    const activeLesson = screen.getByTestId('module-lesson-intro');
    expect(activeLesson.getAttribute('aria-current')).toBe('page');
  });

  it('inactive lesson does not have aria-current', () => {
    render(<Module title="Module 1" lessons={sampleLessons} />);
    const inactiveLesson = screen.getByTestId('module-lesson-setup');
    expect(inactiveLesson.getAttribute('aria-current')).toBeNull();
  });

  it('displays progress info', () => {
    render(
      <Module title="Module 1" lessons={sampleLessons} completedLessons={1} totalLessons={5} />,
    );
    expect(screen.getByText('1 of 5 lessons')).toBeInTheDocument();
  });

  it('module header has aria-expanded attribute', () => {
    render(<Module title="Module 1" lessons={sampleLessons} />);
    const header = screen.getByText('Module 1').closest('button');
    expect(header?.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(header!);
    expect(header?.getAttribute('aria-expanded')).toBe('false');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <Module title="Test Module" lessons={[{ id: '1', title: 'Lesson 1' }]} />,
    );
  });
});
