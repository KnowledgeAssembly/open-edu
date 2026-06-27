import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemedButton } from './themed-button';

describe('ThemedButton', () => {
  it('renders children text', () => {
    render(<ThemedButton>Click me</ThemedButton>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ThemedButton onClick={onClick}>Click</ThemedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<ThemedButton disabled>Disabled</ThemedButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <ThemedButton disabled onClick={onClick}>
        Disabled
      </ThemedButton>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies primary variant classes by default', () => {
    render(<ThemedButton>Primary</ThemedButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('text-on-primary');
  });

  it('applies secondary variant classes', () => {
    render(<ThemedButton variant="secondary">Secondary</ThemedButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-secondary');
  });

  it('applies outline variant classes', () => {
    render(<ThemedButton variant="outline">Outline</ThemedButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('border-outline-variant');
  });

  it('applies ghost variant classes', () => {
    render(<ThemedButton variant="ghost">Ghost</ThemedButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-on-surface');
  });

  it('applies sm size classes', () => {
    render(<ThemedButton size="sm">Small</ThemedButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-xs');
  });

  it('applies md size classes by default', () => {
    render(<ThemedButton>Medium</ThemedButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-sm');
  });

  it('applies lg size classes', () => {
    render(<ThemedButton size="lg">Large</ThemedButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-base');
  });

  it('merges custom className', () => {
    render(<ThemedButton className="my-custom">Custom</ThemedButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('my-custom');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <ThemedButton data-testid="custom-btn" type="submit">
        Submit
      </ThemedButton>,
    );
    const button = screen.getByTestId('custom-btn');
    expect(button.getAttribute('type')).toBe('submit');
  });
});
