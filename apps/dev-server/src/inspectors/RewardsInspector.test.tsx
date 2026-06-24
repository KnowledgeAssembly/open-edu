import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RewardsInspector } from './RewardsInspector';
import type { RewardReceipt } from '@open-edu/rewards';

const sampleReceipts: RewardReceipt[] = [
  {
    actionId: 'r1',
    actionType: 'badge.award',
    dispatchedAt: Date.now() - 5000,
    status: 'delivered',
    detail: 'Badge "completer" awarded',
  },
  {
    actionId: 'r2',
    actionType: 'webhook',
    dispatchedAt: Date.now() - 3000,
    status: 'failed',
    detail: 'Webhook failed',
    error: 'Connection refused',
  },
  {
    actionId: 'r3',
    actionType: 'badge.award',
    dispatchedAt: Date.now() - 1000,
    status: 'skipped',
    detail: 'Condition not met',
  },
];

const sampleDefinedRewards = [
  { action: 'badge.award', badge: 'completer' },
  {
    action: 'badge.award',
    badge: 'high-scorer',
    condition: { type: 'score', nodeId: 'quiz1', minScore: 80 },
  },
  {
    action: 'webhook',
    condition: { type: 'skill', skillId: 'math', minLevel: 'mastered' },
  },
];

describe('RewardsInspector', () => {
  it('should show zero-state when no rewards are configured', () => {
    render(<RewardsInspector receipts={[]} definedRewards={[]} />);
    expect(screen.getByText(/No rewards configured/)).toBeInTheDocument();
  });

  it('should display dispatched rewards with status', () => {
    render(<RewardsInspector receipts={sampleReceipts} definedRewards={sampleDefinedRewards} />);
    const actionTypes = screen.getAllByText('badge.award');
    expect(actionTypes).toHaveLength(2);
    expect(screen.getByText('delivered')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('skipped')).toBeInTheDocument();
  });

  it('should show dispatched count', () => {
    render(<RewardsInspector receipts={sampleReceipts} definedRewards={sampleDefinedRewards} />);
    expect(screen.getByText(/Dispatched/)).toBeInTheDocument();
  });

  it('should show pending rewards with conditions', () => {
    render(<RewardsInspector receipts={sampleReceipts} definedRewards={sampleDefinedRewards} />);
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
  });

  it('should show re-send button for failed receipts with onResend callback', () => {
    const onResend = vi.fn();
    render(
      <RewardsInspector
        receipts={sampleReceipts}
        definedRewards={sampleDefinedRewards}
        onResend={onResend}
      />,
    );
    const resendBtns = screen.getAllByText('Re-send');
    expect(resendBtns).toHaveLength(1);
    fireEvent.click(resendBtns[0]!);
    expect(onResend).toHaveBeenCalledWith(sampleReceipts[1]);
  });

  it('should show error message for failed receipts', () => {
    const onResend = vi.fn();
    render(
      <RewardsInspector
        receipts={sampleReceipts}
        definedRewards={sampleDefinedRewards}
        onResend={onResend}
      />,
    );
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });

  it('should show empty state when no receipts and no pending but rewards defined', () => {
    render(
      <RewardsInspector
        receipts={[]}
        definedRewards={[{ action: 'badge.award', badge: 'test' }]}
      />,
    );
    expect(screen.getByText(/No rewards have been triggered yet/)).toBeInTheDocument();
  });

  it('should show condition text for condition-based defined rewards', () => {
    render(<RewardsInspector receipts={sampleReceipts} definedRewards={sampleDefinedRewards} />);
    expect(screen.getByText(/Condition:/)).toBeInTheDocument();
  });
});
