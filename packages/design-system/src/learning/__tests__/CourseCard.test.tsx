import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseCard } from '../CourseCard.js';
import type { CourseCardProps } from '../CourseCard.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

function makeProps(overrides: Partial<CourseCardProps> = {}): CourseCardProps {
  return {
    manifest: {
      id: 'intro-js',
      title: 'Intro to JavaScript',
      version: '1.0.0',
      author: 'Jane Doe',
      entry: 'index.json',
    },
    nodeCount: 10,
    badgeCount: 3,
    earnedBadgeCount: 1,
    progress: null,
    onStart: vi.fn(),
    ...overrides,
  };
}

describe('CourseCard', () => {
  it('renders title and author', () => {
    render(<CourseCard {...makeProps()} />);
    expect(screen.getByText('Intro to JavaScript')).toBeInTheDocument();
    expect(screen.getByText('by Jane Doe')).toBeInTheDocument();
  });

  it('shows progress indicator when in-progress', () => {
    render(
      <CourseCard
        {...makeProps({
          progress: {
            packageId: 'intro-js',
            packageVersion: '1.0.0',
            currentNodeId: 'lesson-3',
            visitedNodes: ['lesson-1', 'lesson-2', 'lesson-3'],
            scores: {},
            isCompleted: false,
            updatedAt: '2025-01-01T00:00:00Z',
          },
        })}
      />,
    );
    const card = screen.getByTestId('course-card');
    expect(card.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('shows "N of N lessons" and checkmark when completed', () => {
    render(
      <CourseCard
        {...makeProps({
          progress: {
            packageId: 'intro-js',
            packageVersion: '1.0.0',
            currentNodeId: 'lesson-10',
            visitedNodes: Array.from({ length: 10 }, (_, i) => `lesson-${i + 1}`),
            scores: {},
            isCompleted: true,
            updatedAt: '2025-01-01T00:00:00Z',
          },
        })}
      />,
    );
    expect(screen.getByText('10 of 10 lessons')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows "Badge earned" when completed with badges', () => {
    render(
      <CourseCard
        {...makeProps({
          earnedBadgeCount: 2,
          progress: {
            packageId: 'intro-js',
            packageVersion: '1.0.0',
            currentNodeId: 'lesson-10',
            visitedNodes: Array.from({ length: 10 }, (_, i) => `lesson-${i + 1}`),
            scores: {},
            isCompleted: true,
            updatedAt: '2025-01-01T00:00:00Z',
          },
        })}
      />,
    );
    expect(screen.getByText('Badge earned')).toBeInTheDocument();
  });

  it('does not show progress bar when completed', () => {
    const { container } = render(
      <CourseCard
        {...makeProps({
          progress: {
            packageId: 'intro-js',
            packageVersion: '1.0.0',
            currentNodeId: 'lesson-10',
            visitedNodes: Array.from({ length: 10 }, (_, i) => `lesson-${i + 1}`),
            scores: {},
            isCompleted: true,
            updatedAt: '2025-01-01T00:00:00Z',
          },
        })}
      />,
    );
    // Progress element should not be present when completed
    expect(container.querySelector('[role="progressbar"]')).not.toBeInTheDocument();
  });

  it('card is clickable', () => {
    const onStart = vi.fn();
    render(<CourseCard {...makeProps({ onStart })} />);
    const card = screen.getByTestId('course-card');
    expect(card).toHaveClass('cursor-pointer');
    fireEvent.click(card);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('renders lesson count', () => {
    render(<CourseCard {...makeProps()} />);
    expect(screen.getByText('10 lessons')).toBeInTheDocument();
  });

  it('calls onStart when card clicked', () => {
    const onStart = vi.fn();
    render(<CourseCard {...makeProps({ onStart })} />);
    fireEvent.click(screen.getByTestId('course-card'));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<CourseCard {...makeProps()} />);
  });

  it('renders a cover image from the image prop', () => {
    render(<CourseCard {...makeProps({ image: 'https://cdn.example.com/course.png' })} />);
    const cover = screen.getByTestId('course-card-cover');
    const img = cover.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/course.png');
  });

  it('renders a prepackaged cover when image is omitted', () => {
    render(<CourseCard {...makeProps()} />);
    const cover = screen.getByTestId('course-card-cover');
    const img = cover.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src') ?? '').toContain('data:image/svg+xml');
  });

  it('uses full-height flex layout for uniform grid cards', () => {
    render(<CourseCard {...makeProps()} />);
    const card = screen.getByTestId('course-card');
    expect(card.className).toContain('h-full');
    expect(card.className).toContain('flex');
    expect(card.className).toContain('flex-col');
    expect(card.className).toContain('justify-between');
  });
});
