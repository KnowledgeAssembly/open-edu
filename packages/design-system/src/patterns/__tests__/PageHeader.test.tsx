import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders title text', () => {
    render(<PageHeader title="Course Catalog" />);
    expect(screen.getByText('Course Catalog')).toBeInTheDocument();
  });

  it('renders eyebrow when provided', () => {
    render(<PageHeader eyebrow="Catalog" title="Course Catalog" />);
    expect(screen.getByText('Catalog')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="My Progress" subtitle="Track your learning journey" />);
    expect(screen.getByText('Track your learning journey')).toBeInTheDocument();
  });

  it('AssemblyFlow SVG has aria-hidden="true"', () => {
    const { container } = render(<PageHeader title="Test" />);
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).toBeInTheDocument();
  });

  it('has data-testid="page-header"', () => {
    render(<PageHeader title="Test" />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('does not render eyebrow when not provided', () => {
    render(<PageHeader title="Test" />);
    expect(screen.queryByRole('span')).not.toBeInTheDocument();
  });
});
