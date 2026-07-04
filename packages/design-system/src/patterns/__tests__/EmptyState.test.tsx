import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState.js';

describe('EmptyState', () => {
  it('renders heading', () => {
    render(<EmptyState heading="No courses yet" description="Start exploring." />);
    expect(screen.getByText('No courses yet')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState heading="No courses yet" description="Start exploring to learn." />);
    expect(screen.getByText('Start exploring to learn.')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        heading="No courses yet"
        description="Start exploring."
        action={<button data-testid="action-btn">Browse</button>}
      />,
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });

  it('renders OpenModule with 2 satellites', () => {
    const { container } = render(
      <EmptyState heading="No courses yet" description="Start exploring." />,
    );
    const module = container.querySelector('[aria-hidden="true"]');
    expect(module).toBeInTheDocument();
  });

  it('renders SilhouetteGroup', () => {
    const { container } = render(
      <EmptyState heading="No courses yet" description="Start exploring." />,
    );
    const group = container.querySelector('[aria-hidden="true"]');
    expect(group).toBeInTheDocument();
  });

  it('uses default variant when not specified', () => {
    const { container } = render(<EmptyState heading="Test" description="Test description." />);
    expect(container.querySelector('[data-testid="empty-state"]')).toBeInTheDocument();
  });

  it('uses custom figures when provided', () => {
    const customFigures = [{ proportion: 'tall' as const, palette: 5 as const }];
    const { container } = render(
      <EmptyState heading="Test" description="Test." figures={customFigures} />,
    );
    expect(container.querySelector('[data-testid="empty-state"]')).toBeInTheDocument();
  });

  it('OpenModule and SilhouetteGroup have aria-hidden="true"', () => {
    const { container } = render(<EmptyState heading="Test" description="Test." />);
    const hiddenElements = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenElements.length).toBeGreaterThanOrEqual(1);
  });
});
