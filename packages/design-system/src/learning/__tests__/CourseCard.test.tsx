import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseCard } from '../CourseCard.js';
import type { CourseCardProps } from '../CourseCard.js';

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

  it('shows "Start" when progress is null', () => {
    render(<CourseCard {...makeProps()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Start');
  });

  it('shows "Continue" when progress exists but not completed', () => {
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
    expect(screen.getByRole('button')).toHaveTextContent('Continue');
  });

  it('shows "Review" when completed', () => {
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
    expect(screen.getByRole('button')).toHaveTextContent('Review');
  });

  it('button has correct aria-label', () => {
    render(<CourseCard {...makeProps()} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'Start Intro to JavaScript');
  });

  it('renders lesson count', () => {
    render(<CourseCard {...makeProps()} />);
    expect(screen.getByText('10 lessons')).toBeInTheDocument();
  });

  it('calls onStart when button clicked', () => {
    const onStart = vi.fn();
    render(<CourseCard {...makeProps({ onStart })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
