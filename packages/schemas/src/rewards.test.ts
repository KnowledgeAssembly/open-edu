import { describe, it, expect } from 'vitest';
import {
  RewardsSchema,
  BadgeActionSchema,
  WebhookActionSchema,
  ScriptActionSchema,
  RewardConditionSchema,
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

describe('RewardConditionSchema', () => {
  it('should accept a score condition', () => {
    expect(RewardConditionSchema.parse({ type: 'score', nodeId: 'quiz-1', minScore: 80 })).toEqual({
      type: 'score',
      nodeId: 'quiz-1',
      minScore: 80,
    });
  });

  it('should accept a skill condition', () => {
    expect(
      RewardConditionSchema.parse({ type: 'skill', skillId: 'math', minLevel: 'mastered' }),
    ).toEqual({ type: 'skill', skillId: 'math', minLevel: 'mastered' });
  });

  it('should accept a chain condition', () => {
    expect(RewardConditionSchema.parse({ type: 'chain', completedNodeIds: ['n1', 'n2'] })).toEqual({
      type: 'chain',
      completedNodeIds: ['n1', 'n2'],
    });
  });

  it('should accept an and condition', () => {
    const result = RewardConditionSchema.parse({
      type: 'and',
      conditions: [
        { type: 'score', nodeId: 'quiz-1', minScore: 80 },
        { type: 'skill', skillId: 'math', minLevel: 'achieved' },
      ],
    });
    expect(result.type).toBe('and');
    expect(result).toHaveProperty('conditions');
  });

  it('should accept an or condition', () => {
    const result = RewardConditionSchema.parse({
      type: 'or',
      conditions: [
        { type: 'score', nodeId: 'quiz-1', minScore: 90 },
        { type: 'score', nodeId: 'quiz-2', minScore: 80 },
      ],
    });
    expect(result.type).toBe('or');
    expect(result).toHaveProperty('conditions');
  });

  it('should accept a reward action with condition', () => {
    const action = {
      action: 'badge.award',
      badge: 'conditional-badge',
      condition: { type: 'score', nodeId: 'quiz-1', minScore: 80 },
    };
    expect(BadgeActionSchema.parse(action)).toEqual(action);
  });

  it('should reject a condition with negative minScore', () => {
    expect(() =>
      RewardConditionSchema.parse({ type: 'score', nodeId: 'quiz-1', minScore: -1 }),
    ).toThrow();
  });

  it('should reject a condition with unknown type', () => {
    expect(() => RewardConditionSchema.parse({ type: 'unknown' })).toThrow();
  });

  it('should reject invalid minLevel for skill condition', () => {
    expect(() =>
      RewardConditionSchema.parse({ type: 'skill', skillId: 'math', minLevel: 'novice' }),
    ).toThrow();
  });

  it('should reject empty chain completedNodeIds', () => {
    expect(() => RewardConditionSchema.parse({ type: 'chain', completedNodeIds: [] })).toThrow();
  });
});
