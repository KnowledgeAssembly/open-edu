import { describe, it, expect } from 'vitest';
import {
  REWARDS_VERSION,
  RewardBroker,
  BadgeTracker,
  handleBadgeAction,
  handleWebhookAction,
  handleScriptAction,
  RewardError,
  RewardExecutionError,
  RewardConfigurationError,
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
    expect(handleScriptAction).toBeDefined();
  });

  it('should export error classes', () => {
    expect(RewardError).toBeDefined();
    expect(RewardExecutionError).toBeDefined();
    expect(RewardConfigurationError).toBeDefined();
  });
});
