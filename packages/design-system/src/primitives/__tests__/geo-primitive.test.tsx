import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeoPrimitive } from '../geo-primitive';

describe('GeoPrimitive', () => {
  it('renders with default size', () => {
    render(<GeoPrimitive data-testid="primitive" />);
    const svg = screen.getByTestId('primitive');
    expect(svg).toHaveAttribute('width', '20');
  });

  it('renders with lg size', () => {
    render(<GeoPrimitive size="lg" data-testid="primitive" />);
    const svg = screen.getByTestId('primitive');
    expect(svg).toHaveAttribute('width', '24');
  });

  it('applies custom className', () => {
    render(<GeoPrimitive className="text-primary" data-testid="primitive" />);
    expect(screen.getByTestId('primitive')).toHaveClass('text-primary');
  });
});
