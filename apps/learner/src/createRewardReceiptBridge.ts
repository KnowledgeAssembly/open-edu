import { Subject, type Observable } from 'rxjs';
import type { RewardReceipt } from '@open-edu/rewards';

export interface RewardReceiptBridge {
  receipts$: Observable<RewardReceipt>;
  onReceipt: (receipt: RewardReceipt) => void;
}

export function createRewardReceiptBridge(): RewardReceiptBridge {
  const subject = new Subject<RewardReceipt>();
  return {
    receipts$: subject.asObservable(),
    onReceipt: (receipt) => subject.next(receipt),
  };
}
