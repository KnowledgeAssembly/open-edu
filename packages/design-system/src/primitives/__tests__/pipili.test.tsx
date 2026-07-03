import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pipili } from '../pipili';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Pipili', () => {
  it('renders with default size and mood', () => {
    render(<Pipili data-testid="pipili" />);
    const el = screen.getByTestId('pipili');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'img');
    expect(el).toHaveAttribute('aria-label', 'Pipili — idle');
  });

  it('renders with xs size', () => {
    render(<Pipili size="xs" data-testid="pipili" />);
    const el = screen.getByTestId('pipili');
    expect(el.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with xl size', () => {
    render(<Pipili size="xl" data-testid="pipili" />);
    const el = screen.getByTestId('pipili');
    expect(el.querySelector('svg')).toBeInTheDocument();
  });

  it('applies curious mood animation', () => {
    render(<Pipili mood="curious" data-testid="pipili" />);
    const el = screen.getByTestId('pipili');
    expect(el.querySelector('[class*="animate-bounce"]')).toBeInTheDocument();
  });

  it('applies thinking mood animation', () => {
    render(<Pipili mood="thinking" data-testid="pipili" />);
    const el = screen.getByTestId('pipili');
    expect(el.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it('applies content mood scale', () => {
    render(<Pipili mood="content" data-testid="pipili" />);
    const el = screen.getByTestId('pipili');
    expect(el.querySelector('[class*="scale-110"]')).toBeInTheDocument();
  });

  it('tilts head on curious mood', () => {
    render(<Pipili mood="curious" data-testid="pipili" />);
    const svg = screen.getByTestId('pipili').querySelector('svg');
    expect(svg).toHaveStyle({ transform: 'rotate(-12deg)' });
  });

  it('does not tilt head on idle mood', () => {
    render(<Pipili mood="idle" data-testid="pipili" />);
    const svg = screen.getByTestId('pipili').querySelector('svg');
    expect(svg).toHaveStyle({ transform: 'rotate(0deg)' });
  });

  it('includes motion-reduce classes for accessibility', () => {
    render(<Pipili data-testid="pipili" />);
    const innerDiv = screen.getByTestId('pipili').querySelector('[class*="motion-reduce"]');
    expect(innerDiv).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Pipili className="ml-4" data-testid="pipili" />);
    expect(screen.getByTestId('pipili')).toHaveClass('ml-4');
  });

  describe('accessibility', () => {
    it('has no violations with default props', async () => {
      await checkAccessibility(<Pipili />);
    });

    it('has no violations with curious mood', async () => {
      await checkAccessibility(<Pipili mood="curious" />);
    });

    it('has no violations with thinking mood', async () => {
      await checkAccessibility(<Pipili mood="thinking" />);
    });

    it('has no violations with content mood', async () => {
      await checkAccessibility(<Pipili mood="content" />);
    });

    it('has no violations at xs size', async () => {
      await checkAccessibility(<Pipili size="xs" />);
    });

    it('has no violations at xl size', async () => {
      await checkAccessibility(<Pipili size="xl" />);
    });
  });
});
