import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeoPrimitive } from '../geo-primitive';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('GeoPrimitive', () => {
  it('renders a circle with default size', () => {
    render(<GeoPrimitive data-testid="primitive" />);
    const svg = screen.getByTestId('primitive');
    expect(svg).toHaveAttribute('width', '20');
    const circle = svg.querySelector('circle');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('r', '8');
  });

  it('renders with lg size', () => {
    render(<GeoPrimitive size="lg" data-testid="primitive" />);
    const svg = screen.getByTestId('primitive');
    expect(svg).toHaveAttribute('width', '24');
  });

  it('applies muted variant class', () => {
    render(<GeoPrimitive variant="muted" data-testid="primitive" />);
    expect(screen.getByTestId('primitive')).toHaveClass('text-muted-foreground');
  });

  it('applies accent variant class', () => {
    render(<GeoPrimitive variant="accent" data-testid="primitive" />);
    expect(screen.getByTestId('primitive')).toHaveClass('text-primary');
  });

  it('applies custom className', () => {
    render(<GeoPrimitive className="text-red-500" data-testid="primitive" />);
    expect(screen.getByTestId('primitive')).toHaveClass('text-red-500');
  });

  it('marks SVG as aria-hidden', () => {
    render(<GeoPrimitive data-testid="primitive" />);
    expect(screen.getByTestId('primitive')).toHaveAttribute('aria-hidden', 'true');
  });

  describe('accessibility', () => {
    it('has no violations with default props', async () => {
      await checkAccessibility(<GeoPrimitive />);
    });

    it('has no violations at xs size', async () => {
      await checkAccessibility(<GeoPrimitive size="xs" />);
    });

    it('has no violations at sm size', async () => {
      await checkAccessibility(<GeoPrimitive size="sm" />);
    });

    it('has no violations at md size', async () => {
      await checkAccessibility(<GeoPrimitive size="md" />);
    });

    it('has no violations at lg size', async () => {
      await checkAccessibility(<GeoPrimitive size="lg" />);
    });

    it('has no violations at xl size', async () => {
      await checkAccessibility(<GeoPrimitive size="xl" />);
    });

    it('has no violations with muted variant', async () => {
      await checkAccessibility(<GeoPrimitive variant="muted" />);
    });

    it('has no violations with accent variant', async () => {
      await checkAccessibility(<GeoPrimitive variant="accent" />);
    });

    it('has no violations in a grid assembly', async () => {
      await checkAccessibility(
        <div role="img" aria-label="Module progress indicators">
          {Array.from({ length: 12 }).map((_, i) => (
            <GeoPrimitive
              key={i}
              size="md"
              variant={i % 3 === 0 ? 'accent' : i % 3 === 1 ? 'muted' : 'default'}
            />
          ))}
        </div>,
      );
    });

    it('has no violations in an orbital assembly', async () => {
      await checkAccessibility(
        <div role="img" aria-label="Concept with related ideas">
          <GeoPrimitive size="xl" variant="accent" />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <GeoPrimitive key={angle} size="sm" variant="muted" />
          ))}
        </div>,
      );
    });

    it('has no violations in a linear assembly', async () => {
      await checkAccessibility(
        <div role="img" aria-label="Learning path with 5 steps">
          {Array.from({ length: 5 }).map((_, i) => (
            <GeoPrimitive key={i} size="md" variant={i === 2 ? 'accent' : 'muted'} />
          ))}
        </div>,
      );
    });
  });
});
