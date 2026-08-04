import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Subject } from 'rxjs';
import type { RewardReceipt } from '@open-edu/rewards';
import { RewardEventBridge } from '../RewardEventBridge.js';

vi.mock('../RewardAnimation', () => ({
  RewardAnimation: ({
    type,
    badgeName,
    xpAmount,
    onComplete,
  }: {
    type: string;
    badgeName?: string;
    xpAmount?: number;
    onComplete?: () => void;
  }) => (
    <div data-testid="reward-animation" data-type={type} data-badge={badgeName} data-xp={xpAmount}>
      <button data-testid="complete-reward" onClick={onComplete}>
        done
      </button>
    </div>
  ),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

describe('RewardEventBridge', () => {
  it('renders nothing when no receipts', () => {
    const subject = new Subject<RewardReceipt>();
    const { container } = render(<RewardEventBridge receipts$={subject} />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it('renders badge-unlock animation on badge.award receipt', () => {
    const subject = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={subject} />, { wrapper });

    act(() => {
      subject.next({
        actionId: 'r1',
        actionType: 'badge.award',
        actionKey: 'First Steps',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: '',
      } as RewardReceipt);
    });

    expect(screen.getByTestId('reward-animation')).toBeInTheDocument();
    expect(screen.getByTestId('reward-animation').getAttribute('data-type')).toBe('badge-unlock');
    expect(screen.getByTestId('reward-animation').getAttribute('data-badge')).toBe('First Steps');
  });

  it('renders xp-gain animation on xp.award receipt', () => {
    const subject = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={subject} />, { wrapper });

    act(() => {
      subject.next({
        actionId: 'r2',
        actionType: 'xp.award',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: '50',
      } as RewardReceipt);
    });

    expect(screen.getByTestId('reward-animation').getAttribute('data-type')).toBe('xp-gain');
    expect(screen.getByTestId('reward-animation').getAttribute('data-xp')).toBe('50');
  });

  it('queues rewards when one is already showing', () => {
    const subject = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={subject} />, { wrapper });

    act(() => {
      subject.next({
        actionId: 'r1',
        actionType: 'badge.award',
        actionKey: 'Badge 1',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: '',
      } as RewardReceipt);
      subject.next({
        actionId: 'r2',
        actionType: 'xp.award',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: '25',
      } as RewardReceipt);
    });

    expect(screen.getByTestId('reward-animation').getAttribute('data-type')).toBe('badge-unlock');

    act(() => {
      screen.getByTestId('complete-reward').click();
    });

    expect(screen.getByTestId('reward-animation').getAttribute('data-type')).toBe('xp-gain');
  });

  it('ignores skipped/failed receipts', () => {
    const subject = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={subject} />, { wrapper });

    act(() => {
      subject.next({
        actionId: 'r1',
        actionType: 'badge.award',
        dispatchedAt: Date.now(),
        status: 'skipped',
        detail: '',
      } as RewardReceipt);
    });

    expect(screen.queryByTestId('reward-animation')).not.toBeInTheDocument();
  });

  it('unsubscribes from receipts on unmount', () => {
    const subject = new Subject<RewardReceipt>();
    const { unmount } = render(<RewardEventBridge receipts$={subject} />, { wrapper });
    unmount();

    act(() => {
      subject.next({
        actionId: 'r1',
        actionType: 'badge.award',
        actionKey: 'Badge 1',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: '',
      } as RewardReceipt);
    });

    expect(screen.queryByTestId('reward-animation')).not.toBeInTheDocument();
  });
});
