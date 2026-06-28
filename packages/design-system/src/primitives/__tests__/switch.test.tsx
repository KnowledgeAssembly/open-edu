import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Switch } from '../switch.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Switch', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Switch aria-label="Toggle setting" />);
  });
  it('renders switch element', () => {
    render(<Switch />);
    const sw = screen.getByRole('switch');
    expect(sw).toBeDefined();
  });

  it('sets displayName', () => {
    expect(Switch.displayName).toBe('Switch');
  });
});
