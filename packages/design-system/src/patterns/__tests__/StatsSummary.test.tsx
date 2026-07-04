import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsSummary } from '../StatsSummary';

describe('StatsSummary', () => {
  const items = [
    { value: 10, label: 'courses' },
    { value: 3, label: 'in progress', color: 'success' as const },
    { value: 5, label: 'badges', color: 'tertiary' as const },
  ];

  it('renders all items', () => {
    render(<StatsSummary items={items} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders item labels', () => {
    render(<StatsSummary items={items} />);
    expect(screen.getByText('courses')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    expect(screen.getByText('badges')).toBeInTheDocument();
  });

  it('applies correct color class based on color prop', () => {
    render(<StatsSummary items={items} />);
    const valueElements = screen.getAllByText(/10|3|5/);
    expect(valueElements[0]).toHaveClass('text-primary');
    expect(valueElements[1]).toHaveClass('text-success');
    expect(valueElements[2]).toHaveClass('text-tertiary');
  });

  it('renders icon when provided', () => {
    const itemsWithIcons = [
      { value: 1, label: 'test', icon: <span data-testid="test-icon">*</span> },
    ];
    render(<StatsSummary items={itemsWithIcons} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('defaults to 3 columns', () => {
    const { container } = render(<StatsSummary items={items} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid-cols-3');
  });

  it('applies animated class when animated prop is true', () => {
    const { container } = render(<StatsSummary items={items} animated />);
    const items_ = container.querySelectorAll('[data-testid^="stats-item-"]');
    expect(items_[0]!.className).toContain('animate-orbit-float');
  });
});
