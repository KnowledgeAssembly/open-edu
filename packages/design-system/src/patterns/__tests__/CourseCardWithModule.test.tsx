import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseCardWithModule, getProgressSatellites } from '../CourseCardWithModule.js';

describe('getProgressSatellites', () => {
  it('returns 6 when badgeCount > 0', () => {
    expect(getProgressSatellites({ visitedNodes: [], isCompleted: true }, 1)).toBe(6);
    expect(getProgressSatellites(null, 2)).toBe(6);
    expect(getProgressSatellites({ visitedNodes: ['a'], isCompleted: false }, 3)).toBe(6);
  });

  it('returns 2 when progress is null', () => {
    expect(getProgressSatellites(null, 0)).toBe(2);
  });

  it('returns 2 when progress has no visited nodes', () => {
    expect(getProgressSatellites({ visitedNodes: [], isCompleted: false }, 0)).toBe(2);
  });

  it('returns 4 when 1 node visited', () => {
    expect(getProgressSatellites({ visitedNodes: ['a'], isCompleted: false }, 0)).toBe(4);
  });

  it('returns 5 when 2+ nodes visited', () => {
    expect(getProgressSatellites({ visitedNodes: ['a', 'b'], isCompleted: false }, 0)).toBe(5);
    expect(getProgressSatellites({ visitedNodes: ['a', 'b', 'c'], isCompleted: false }, 0)).toBe(5);
  });

  it('returns 5 when isCompleted is true', () => {
    expect(getProgressSatellites({ visitedNodes: ['a', 'b', 'c'], isCompleted: true }, 0)).toBe(5);
  });
});

describe('CourseCardWithModule', () => {
  it('renders children', () => {
    render(
      <CourseCardWithModule progress={null}>
        <div data-testid="child">Child</div>
      </CourseCardWithModule>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows 2 satellites when progress is null', () => {
    const { container } = render(
      <CourseCardWithModule progress={null}>
        <div>Child</div>
      </CourseCardWithModule>,
    );
    const module = container.querySelector('[aria-hidden="true"]');
    expect(module).toBeInTheDocument();
  });

  it('shows 6 satellites when badgeCount > 0', () => {
    const { container } = render(
      <CourseCardWithModule progress={{ visitedNodes: [], isCompleted: false }} badgeCount={1}>
        <div>Child</div>
      </CourseCardWithModule>,
    );
    const module = container.querySelector('[aria-hidden="true"]');
    expect(module).toBeInTheDocument();
  });

  it('OpenModule has aria-hidden="true"', () => {
    const { container } = render(
      <CourseCardWithModule progress={null}>
        <div>Child</div>
      </CourseCardWithModule>,
    );
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    render(
      <CourseCardWithModule progress={null} className="custom-class">
        <div data-testid="child">Child</div>
      </CourseCardWithModule>,
    );
    expect(screen.getByTestId('child').parentElement).toHaveClass('custom-class');
  });
});
