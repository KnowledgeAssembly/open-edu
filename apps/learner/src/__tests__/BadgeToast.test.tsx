import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BadgeToast } from '../BadgeToast';

describe('BadgeToast', () => {
  it('renders badge name when visible', () => {
    render(<BadgeToast badgeName="Test Badge" visible={true} />);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('shows achievement unlocked text', () => {
    render(<BadgeToast badgeName="Test Badge" visible={true} />);
    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<BadgeToast badgeName="Test Badge" visible={false} />);
    expect(screen.queryByText('Test Badge')).not.toBeInTheDocument();
  });

  it('calls onDismiss after auto-dismiss timeout', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<BadgeToast badgeName="Test" visible={true} onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('has displayName set', () => {
    expect(BadgeToast.displayName).toBe('BadgeToast');
  });

  it('renders with data-testid badge-toast', () => {
    render(<BadgeToast badgeName="Test" visible={true} />);
    expect(screen.getByTestId('badge-toast')).toBeInTheDocument();
  });

  it('unmounts from DOM after dismiss with animation delay', () => {
    vi.useFakeTimers();
    const { rerender } = render(<BadgeToast badgeName="Test" visible={true} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    rerender(<BadgeToast badgeName="Test" visible={false} />);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
