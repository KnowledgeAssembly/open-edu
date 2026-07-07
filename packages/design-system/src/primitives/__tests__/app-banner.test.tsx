import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppBanner } from '../app-banner.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('AppBanner', () => {
  it('renders children correctly', () => {
    render(<AppBanner>Hello World</AppBanner>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders with info variant by default', () => {
    render(<AppBanner>Info</AppBanner>);
    const banner = screen.getByRole('status');
    expect(banner.className).toContain('bg-surface-container');
  });

  it('renders with warning variant', () => {
    render(<AppBanner variant="warning">Warning</AppBanner>);
    const banner = screen.getByRole('status');
    expect(banner.className).toContain('bg-tertiary-container');
  });

  it('renders with break variant', () => {
    render(<AppBanner variant="break">Break</AppBanner>);
    const banner = screen.getByRole('status');
    expect(banner.className).toContain('bg-primary-fixed');
  });

  it('renders icon in icon slot', () => {
    render(<AppBanner icon={<span data-testid="test-icon">icon</span>}>Msg</AppBanner>);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders actions in actions slot', () => {
    render(<AppBanner actions={<button data-testid="test-action">Action</button>}>Msg</AppBanner>);
    expect(screen.getByTestId('test-action')).toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    render(<AppBanner onDismiss={vi.fn()}>Msg</AppBanner>);
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when X is clicked', () => {
    const onDismiss = vi.fn();
    render(<AppBanner onDismiss={onDismiss}>Msg</AppBanner>);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<AppBanner>Test</AppBanner>);
  });

  it('sets displayName', () => {
    expect(AppBanner.displayName).toBe('AppBanner');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<AppBanner ref={ref}>Ref</AppBanner>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('has role="status" and aria-live="polite"', () => {
    render(<AppBanner>Live</AppBanner>);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });
});
