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
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });
    const onDismiss = vi.fn();
    render(<BadgeToast badgeName="Test" visible={true} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
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
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });
    const { rerender } = render(<BadgeToast badgeName="Test" visible={true} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    rerender(<BadgeToast badgeName="Test" visible={false} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('sets accessible role and aria-live attributes', () => {
    render(<BadgeToast badgeName="Test Badge" visible={true} />);
    const toast = screen.getByTestId('badge-toast');
    expect(toast).toHaveAttribute('role', 'status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('sets aria-label containing badge name', () => {
    render(<BadgeToast badgeName="Super Star" visible={true} />);
    const toast = screen.getByTestId('badge-toast');
    expect(toast).toHaveAttribute('aria-label', 'Badge earned: Super Star');
  });

  it('respects autoDismissMs custom override', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });
    const onDismiss = vi.fn();
    render(
      <BadgeToast badgeName="Test" visible={true} onDismiss={onDismiss} autoDismissMs={2000} />,
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not call onDismiss before autoDismissMs elapses', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });
    const onDismiss = vi.fn();
    render(
      <BadgeToast badgeName="Test" visible={true} onDismiss={onDismiss} autoDismissMs={4000} />,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
