import { useEffect, useState, useRef } from 'react';
import type { Observable } from 'rxjs';
import type { RewardReceipt } from '@open-edu/rewards';
import { RewardAnimation, type RewardAnimationType } from './RewardAnimation.js';

export interface RewardEventBridgeProps {
  receipts$: Observable<RewardReceipt>;
}

interface QueuedReward {
  id: string;
  type: RewardAnimationType;
  badgeName?: string;
  xpAmount?: number;
}

function parseXpAmount(detail: string | undefined): number | undefined {
  if (detail === undefined) return undefined;
  if (typeof detail === 'object' && detail !== null) {
    const amount = Number((detail as Record<string, unknown>).amount ?? 0);
    return Number.isNaN(amount) ? undefined : amount;
  }
  const parsed = Number(detail);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function receiptToReward(receipt: RewardReceipt): QueuedReward | null {
  switch (receipt.actionType) {
    case 'badge.award':
      return {
        id: receipt.actionId,
        type: 'badge-unlock',
        badgeName: receipt.actionKey,
      };
    case 'xp.award':
      return {
        id: receipt.actionId,
        type: 'xp-gain',
        xpAmount: parseXpAmount(receipt.detail),
      };
    case 'milestone.reached':
      return {
        id: receipt.actionId,
        type: 'milestone',
      };
    default:
      if (receipt.actionType.includes('confetti') || receipt.actionType.includes('celebration')) {
        return { id: receipt.actionId, type: 'confetti' };
      }
      return null;
  }
}

export function RewardEventBridge({ receipts$ }: RewardEventBridgeProps): JSX.Element | null {
  const [queue, setQueue] = useState<QueuedReward[]>([]);
  const [current, setCurrent] = useState<QueuedReward | null>(null);
  const isShowingRef = useRef(false);

  useEffect(() => {
    const subscription = receipts$.subscribe({
      next: (receipt) => {
        if (receipt.status !== 'delivered') return;
        const reward = receiptToReward(receipt);
        if (!reward) return;

        if (isShowingRef.current) {
          setQueue((prev) => [...prev, reward].slice(0, 3));
        } else {
          isShowingRef.current = true;
          setCurrent(reward);
        }
      },
    });

    return () => subscription.unsubscribe();
  }, [receipts$]);

  const handleComplete = () => {
    const next = queue[0] ?? null;
    setQueue((prev) => (prev.length > 0 ? prev.slice(1) : prev));
    isShowingRef.current = next !== null;
    setCurrent(next);
  };

  if (!current && queue.length === 0) return null;

  const active = current ?? queue[0];
  if (!active) return null;

  return (
    <RewardAnimation
      type={active.type}
      badgeName={active.badgeName}
      xpAmount={active.xpAmount}
      onComplete={handleComplete}
    />
  );
}
