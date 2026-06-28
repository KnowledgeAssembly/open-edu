import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../skeleton.jsx';

describe('Skeleton', () => {
  it('renders div element', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toBeDefined();
  });

  it('applies className', () => {
    render(<Skeleton data-testid="skeleton" className="custom-class" />);
    expect(screen.getByTestId('skeleton').className).toContain('custom-class');
  });

  it('sets displayName', () => {
    expect(Skeleton.displayName).toBe('Skeleton');
  });
});
