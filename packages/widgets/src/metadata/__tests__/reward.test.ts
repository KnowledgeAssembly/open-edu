import { describe, it, expect } from 'vitest';
import type { RewardMetadata } from '../reward';

describe('RewardMetadata', () => {
  it('has all reward fields as optional', () => {
    const reward: RewardMetadata = {};
    expect(reward.completionXP).toBeUndefined();
    expect(reward.achievement).toBeUndefined();
    expect(reward.badge).toBeUndefined();
    expect(reward.celebrationAnimation).toBeUndefined();
    expect(reward.collectibleCard).toBeUndefined();
    expect(reward.confetti).toBeUndefined();
    expect(reward.positiveMessage).toBeUndefined();
  });

  it('allows partial reward declarations', () => {
    const reward: RewardMetadata = {
      completionXP: 10,
      confetti: true,
      positiveMessage: 'Great job!',
    };
    expect(reward.completionXP).toBe(10);
    expect(reward.confetti).toBe(true);
    expect(reward.positiveMessage).toBe('Great job!');
  });
});