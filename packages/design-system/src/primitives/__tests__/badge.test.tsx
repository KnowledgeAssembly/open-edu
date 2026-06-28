import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Badge', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Badge>Badge</Badge>);
  });
  it('renders with text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeDefined();
  });

  it('renders with variant classes', () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText('Error').className).toContain('bg-destructive');
  });

  it('sets displayName', () => {
    expect(Badge.displayName).toBe('Badge');
  });
});
