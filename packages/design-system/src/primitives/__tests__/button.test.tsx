import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../button.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Button', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Button>Click me</Button>);
  });
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('renders with variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-destructive');
  });

  it('renders default variant with visible hover classes', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hover:bg-primary/85');
  });

  it('renders with size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-9');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('sets displayName', () => {
    expect(Button.displayName).toBe('Button');
  });
});
