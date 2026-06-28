import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../spinner.jsx';

describe('Spinner', () => {
  it('renders with loading label', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Loading')).toBeDefined();
  });

  it('renders with custom size', () => {
    render(<Spinner size="lg" />);
    const spinner = screen.getByLabelText('Loading');
    expect(spinner.className).toContain('h-8');
  });

  it('sets displayName', () => {
    expect(Spinner.displayName).toBe('Spinner');
  });
});
