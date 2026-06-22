import { describe, it, expect } from 'vitest';
import {
  RewardsSchema,
  BadgeActionSchema,
  WebhookActionSchema,
  ScriptActionSchema,
} from './rewards';

describe('BadgeActionSchema', () => {
  it('should accept a valid badge action', () => {
    expect(BadgeActionSchema.parse({ action: 'badge.award', badge: 'course-complete' })).toEqual({
      action: 'badge.award',
      badge: 'course-complete',
    });
  });

  it('should reject badge action without badge id', () => {
    expect(() => BadgeActionSchema.parse({ action: 'badge.award' })).toThrow();
  });
});

describe('WebhookActionSchema', () => {
  it('should accept a valid webhook action', () => {
    expect(
      WebhookActionSchema.parse({ action: 'webhook', url: 'https://example.com/reward' }),
    ).toEqual({ action: 'webhook', url: 'https://example.com/reward' });
  });

  it('should reject webhook with invalid URL', () => {
    expect(() => WebhookActionSchema.parse({ action: 'webhook', url: 'not-a-url' })).toThrow();
  });
});

describe('ScriptActionSchema', () => {
  it('should accept a valid script action', () => {
    expect(ScriptActionSchema.parse({ action: 'script', exec: './rewards/completed.sh' })).toEqual({
      action: 'script',
      exec: './rewards/completed.sh',
    });
  });
});

describe('RewardsSchema', () => {
  it('should accept a complete rewards config', () => {
    const rewards = {
      triggers: [
        {
          onEvent: 'workflow.complete',
          rewards: [{ action: 'badge.award', badge: 'course-complete' }],
        },
        {
          onEvent: 'quiz.pass',
          rewards: [{ action: 'webhook', url: 'https://example.com/reward' }],
        },
      ],
    };
    expect(RewardsSchema.parse(rewards)).toEqual(rewards);
  });

  it('should accept a trigger with script action', () => {
    const rewards = {
      triggers: [
        {
          onEvent: 'workflow.complete',
          rewards: [{ action: 'script', exec: './rewards/completed.sh' }],
        },
      ],
    };
    expect(RewardsSchema.parse(rewards)).toEqual(rewards);
  });

  it('should accept a trigger with all three action types', () => {
    const rewards = {
      triggers: [
        {
          onEvent: 'workflow.complete',
          rewards: [
            { action: 'badge.award', badge: 'gold-star' },
            { action: 'webhook', url: 'https://example.com/hook' },
            { action: 'script', exec: './rewards/celebrate.sh' },
          ],
        },
      ],
    };
    const result = RewardsSchema.parse(rewards);
    expect(result.triggers[0]!.rewards).toHaveLength(3);
  });

  it('should reject empty triggers array', () => {
    expect(() => RewardsSchema.parse({ triggers: [] })).toThrow();
  });

  it('should reject trigger without onEvent', () => {
    expect(() =>
      RewardsSchema.parse({
        triggers: [{ rewards: [{ action: 'badge.award', badge: 'test' }] }],
      }),
    ).toThrow();
  });

  it('should reject trigger without rewards', () => {
    expect(() =>
      RewardsSchema.parse({
        triggers: [{ onEvent: 'test' }],
      }),
    ).toThrow();
  });

  it('should reject unknown action type', () => {
    expect(() =>
      RewardsSchema.parse({
        triggers: [
          {
            onEvent: 'test',
            rewards: [{ action: 'unknown_action' }],
          },
        ],
      }),
    ).toThrow();
  });
});
