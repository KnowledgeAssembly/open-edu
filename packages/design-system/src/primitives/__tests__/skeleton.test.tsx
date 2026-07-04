import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../skeleton.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Skeleton', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Skeleton className="h-4 w-20" />);
  });
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
