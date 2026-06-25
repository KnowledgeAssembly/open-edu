import { describe, it, expect } from 'vitest';
import {
  REWARDS_VERSION,
  RewardBroker,
  BadgeTracker,
  handleBadgeAction,
  handleWebhookAction,
  RewardError,
  RewardExecutionError,
  RewardConfigurationError,
  evaluateCondition,
  shouldFireAction,
  getDefaultContext,
  verifyReceipt,
} from './index';

describe('@open-edu/rewards exports', () => {
  it('should export a version', () => {
    expect(REWARDS_VERSION).toBe('0.1.0');
  });

  it('should export RewardBroker', () => {
    expect(RewardBroker).toBeDefined();
  });

  it('should export BadgeTracker', () => {
    expect(BadgeTracker).toBeDefined();
  });

  it('should export handler functions', () => {
    expect(handleBadgeAction).toBeDefined();
    expect(handleWebhookAction).toBeDefined();
  });

  it('should export error classes', () => {
    expect(RewardError).toBeDefined();
    expect(RewardExecutionError).toBeDefined();
    expect(RewardConfigurationError).toBeDefined();
  });

  it('should export condition functions', () => {
    expect(evaluateCondition).toBeDefined();
    expect(shouldFireAction).toBeDefined();
    expect(getDefaultContext).toBeDefined();
  });

  it('should export verification functions', () => {
    expect(verifyReceipt).toBeDefined();
  });
});
