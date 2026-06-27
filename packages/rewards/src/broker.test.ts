import { describe, it, expect, beforeEach } from 'vitest';
import { Subject } from 'rxjs';
import { RewardBroker } from './broker';
import type { TelemetryEvent, Rewards } from '@open-edu/schemas';

describe('RewardBroker', () => {
  let subject: Subject<TelemetryEvent>;
  let rewards: Rewards;
  let broker: RewardBroker;

  beforeEach(() => {
    subject = new Subject<TelemetryEvent>();
    rewards = {
      triggers: [
        {
          onEvent: 'node_complete',
          rewards: [{ action: 'badge.award', badge: 'completer' }],
        },
        {
          onEvent: 'quiz_answered',
          rewards: [{ action: 'badge.award', badge: 'quizzer' }],
        },
      ],
    };
  });

  it('should start and become active', () => {
    broker = new RewardBroker({ rewards, source: subject.asObservable() });
    expect(broker.isActive).toBe(false);
    broker.start();
    expect(broker.isActive).toBe(true);
  });

  it('should ignore duplicate start calls', () => {
    broker = new RewardBroker({ rewards, source: subject.asObservable() });
    broker.start();
    broker.start();
    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);
    expect(broker.awardedBadges).toContain('completer');
    expect(broker.results).toHaveLength(1);
  });

  it('should stop and become inactive', () => {
    broker = new RewardBroker({ rewards, source: subject.asObservable() });
    broker.start();
    broker.stop();
    expect(broker.isActive).toBe(false);
  });

  it('should award badges for matching events', () => {
    broker = new RewardBroker({ rewards, source: subject.asObservable() });
    broker.start();

    const event: TelemetryEvent = { event: 'node_complete', nodeId: 'n1', timestamp: 1000 };
    subject.next(event);

    expect(broker.awardedBadges).toContain('completer');
  });

  it('should not match triggers for non-matching events', () => {
    broker = new RewardBroker({ rewards, source: subject.asObservable() });
    broker.start();

    const event: TelemetryEvent = { event: 'hint_triggered', nodeId: 'n1', timestamp: 1000 };
    subject.next(event);

    expect(broker.awardedBadges).toHaveLength(0);
    expect(broker.results).toHaveLength(0);
  });

  it('should handle multiple event types', () => {
    broker = new RewardBroker({ rewards, source: subject.asObservable() });
    broker.start();

    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);
    subject.next({
      event: 'quiz_answered',
      nodeId: 'n1',
      optionId: 'a',
      correct: true,
      timestamp: 2000,
    } as TelemetryEvent);

    expect(broker.awardedBadges).toContain('completer');
    expect(broker.awardedBadges).toContain('quizzer');
  });

  it('should reject script actions by default', () => {
    const scriptRewards: Rewards = {
      triggers: [
        {
          onEvent: 'node_complete',
          rewards: [{ action: 'script', exec: 'echo hello' }],
        },
      ],
    };
    broker = new RewardBroker({ rewards: scriptRewards, source: subject.asObservable() });
    broker.start();

    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);

    expect(broker.results).toHaveLength(1);
    expect(broker.results[0]?.status).toBe('failed');
    expect(broker.results[0]?.detail).toContain('allowShellHooks');
  });

  it('should accumulate results for sync actions', () => {
    const badgeOnlyRewards: Rewards = {
      triggers: [
        {
          onEvent: 'node_complete',
          rewards: [
            { action: 'badge.award', badge: 'double' },
            { action: 'badge.award', badge: 'triple' },
          ],
        },
      ],
    };
    broker = new RewardBroker({ rewards: badgeOnlyRewards, source: subject.asObservable() });
    broker.start();
    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);
    expect(broker.results).toHaveLength(2);
    broker.reset();
    expect(broker.results).toHaveLength(0);
  });

  it('should not process events after stop', () => {
    broker = new RewardBroker({ rewards, source: subject.asObservable() });
    broker.start();
    broker.stop();
    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);
    expect(broker.results).toHaveLength(0);
  });

  it('should return typed receipts with actionId and status', () => {
    broker = new RewardBroker({ rewards, source: subject.asObservable() });
    broker.start();
    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);
    const receipt = broker.results[0];
    expect(receipt).toBeDefined();
    expect(receipt?.actionId).toBeDefined();
    expect(receipt?.actionType).toBe('badge.award');
    expect(receipt?.status).toBe('delivered');
    expect(receipt?.dispatchedAt).toBeGreaterThan(0);
  });

  it('should skip actions when condition is not met', () => {
    const conditionalRewards: Rewards = {
      triggers: [
        {
          onEvent: 'node_complete',
          rewards: [
            {
              action: 'badge.award',
              badge: 'conditional',
              condition: { type: 'score', nodeId: 'quiz1', minScore: 80 },
            },
          ],
        },
      ],
    };
    broker = new RewardBroker({
      rewards: conditionalRewards,
      source: subject.asObservable(),
      context: { scores: { quiz1: 50 }, skills: {}, completedNodes: [], completedModules: [] },
    });
    broker.start();
    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);
    expect(broker.results).toHaveLength(1);
    expect(broker.results[0]?.status).toBe('skipped');
    expect(broker.results[0]?.detail).toContain('Condition not met');
  });

  it('should fire actions when condition is met', () => {
    const conditionalRewards: Rewards = {
      triggers: [
        {
          onEvent: 'node_complete',
          rewards: [
            {
              action: 'badge.award',
              badge: 'conditional',
              condition: { type: 'score', nodeId: 'quiz1', minScore: 80 },
            },
          ],
        },
      ],
    };
    broker = new RewardBroker({
      rewards: conditionalRewards,
      source: subject.asObservable(),
      context: { scores: { quiz1: 90 }, skills: {}, completedNodes: [], completedModules: [] },
    });
    broker.start();
    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);
    expect(broker.results).toHaveLength(1);
    expect(broker.results[0]?.status).toBe('delivered');
  });

  it('should update context and re-evaluate conditions', () => {
    const conditionalRewards: Rewards = {
      triggers: [
        {
          onEvent: 'quiz_answered',
          rewards: [
            {
              action: 'badge.award',
              badge: 'high-scorer',
              condition: { type: 'score', nodeId: 'quiz1', minScore: 80 },
            },
          ],
        },
      ],
    };
    broker = new RewardBroker({
      rewards: conditionalRewards,
      source: subject.asObservable(),
      context: { scores: {}, skills: {}, completedNodes: [], completedModules: [] },
    });
    broker.start();
    broker.updateContext({ scores: { quiz1: 85 } });
    subject.next({
      event: 'quiz_answered',
      nodeId: 'quiz1',
      optionId: 'a',
      correct: true,
      timestamp: 1000,
    } as TelemetryEvent);
    expect(broker.results).toHaveLength(1);
    expect(broker.results[0]?.status).toBe('delivered');
  });

  it('should fire unconditionally when no condition is specified', () => {
    broker = new RewardBroker({
      rewards,
      source: subject.asObservable(),
    });
    broker.start();
    subject.next({ event: 'node_complete', nodeId: 'n1', timestamp: 1000 } as TelemetryEvent);
    expect(broker.results).toHaveLength(1);
    expect(broker.results[0]?.status).toBe('delivered');
  });
});
