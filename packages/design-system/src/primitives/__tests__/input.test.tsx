import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../input.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Input', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Input placeholder="Enter text" />);
  });
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeDefined();
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('sets displayName', () => {
    expect(Input.displayName).toBe('Input');
  });
});
