import { describe, it, expect } from 'vitest';
import type { RewardResult, RewardBrokerOptions, RewardHandler } from './types';
import type { Observable } from 'rxjs';

describe('types', () => {
  it('RewardResult should be a valid type', () => {
    const result: RewardResult = { success: true, action: 'badge.award', detail: 'test' };
    expect(result.success).toBe(true);
  });

  it('RewardBrokerOptions should be a valid type', () => {
    const opts: RewardBrokerOptions = {
      rewards: { triggers: [] },
      source: null as unknown as Observable<any>,
    };
    expect(opts.rewards.triggers).toEqual([]);
  });

  it('RewardHandler should be a valid interface', () => {
    const handler: RewardHandler<string> = {
      execute: async () => ({ success: true, action: 'test' }),
    };
    expect(handler.execute).toBeDefined();
  });
});
