import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Switch } from '../switch.jsx';

describe('Switch', () => {
  it('renders switch element', () => {
    render(<Switch />);
    const sw = screen.getByRole('switch');
    expect(sw).toBeDefined();
  });

  it('sets displayName', () => {
    expect(Switch.displayName).toBe('Switch');
  });
});
