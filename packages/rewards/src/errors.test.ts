import { describe, it, expect } from 'vitest';
import { RewardError, RewardExecutionError, RewardConfigurationError } from './errors';

describe('RewardError', () => {
  it('should set name and code', () => {
    const err = new RewardError('TEST_CODE', 'test message');
    expect(err.name).toBe('RewardError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
  });
});

describe('RewardExecutionError', () => {
  it('should extend RewardError', () => {
    const err = new RewardExecutionError('execution failed');
    expect(err.name).toBe('RewardExecutionError');
    expect(err.code).toBe('REWARD_EXECUTION_ERROR');
  });
});

describe('RewardConfigurationError', () => {
  it('should extend RewardError', () => {
    const err = new RewardConfigurationError('bad config');
    expect(err.name).toBe('RewardConfigurationError');
    expect(err.code).toBe('REWARD_CONFIGURATION_ERROR');
  });
});
