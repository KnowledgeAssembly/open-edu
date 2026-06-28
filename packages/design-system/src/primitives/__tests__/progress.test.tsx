import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from '../progress.jsx';

describe('Progress', () => {
  it('renders with value', () => {
    render(<Progress value={50} />);
    const root = screen.getByRole('progressbar');
    expect(root).toBeDefined();
  });

  it('sets displayName', () => {
    expect(Progress.displayName).toBe('Progress');
  });
});
