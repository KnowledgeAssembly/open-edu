import { describe, it, expect } from 'vitest';
import { CardDefinitionsSchema, RewardsSchema } from '@open-edu/schemas';
import {
  badgeOnQuizPass,
  badgeOnWorkflowComplete,
  mergeRewardTrigger,
  simpleKnowledgeCard,
} from './rewardTemplates';

describe('badgeOnWorkflowComplete', () => {
  it('produces a schema-valid rewards.json document', () => {
    const doc = badgeOnWorkflowComplete('course-star');
    const result = RewardsSchema.safeParse(doc);
    expect(result.success).toBe(true);
    expect(doc.triggers).toEqual([
      { onEvent: 'workflow_complete', rewards: [{ action: 'badge.award', badge: 'course-star' }] },
    ]);
  });
});

describe('badgeOnQuizPass', () => {
  it('produces a schema-valid node_complete trigger with a score condition', () => {
    const doc = badgeOnQuizPass('quiz-star', 'nodes/q1.json');
    const result = RewardsSchema.safeParse(doc);
    expect(result.success).toBe(true);
    const reward = doc.triggers[0]!.rewards[0]!;
    expect(reward).toMatchObject({ action: 'badge.award', badge: 'quiz-star' });
    if (reward.action === 'badge.award' && reward.condition?.type === 'score') {
      expect(reward.condition).toEqual({ type: 'score', nodeId: 'nodes/q1.json', minScore: 80 });
    }
  });

  it('defaults minScore to 80 and honors an explicit minScore', () => {
    const defaulted = badgeOnQuizPass('a', 'nodes/q1.json');
    const custom = badgeOnQuizPass('b', 'nodes/q1.json', 95);
    const defaultReward = defaulted.triggers[0]!.rewards[0]!;
    const customReward = custom.triggers[0]!.rewards[0]!;
    expect(defaultReward).toMatchObject({ condition: { type: 'score', minScore: 80 } });
    expect(customReward).toMatchObject({ condition: { type: 'score', minScore: 95 } });
  });
});

describe('simpleKnowledgeCard', () => {
  it('accepts a chain unlock and produces a schema-valid card document', () => {
    const card = simpleKnowledgeCard('card-1', 'Plant cells', 'Plants build food from light.', {
      type: 'chain',
      completedNodeIds: ['nodes/lesson.md', 'nodes/quiz.json'],
    });
    const result = CardDefinitionsSchema.safeParse({ cards: [card] });
    expect(result.success).toBe(true);
    expect(card).toMatchObject({
      id: 'card-1',
      title: 'Plant cells',
      category: 'Knowledge',
      type: 'knowledge',
      summary: 'Plants build food from light.',
      unlock: {
        type: 'chain',
        completedNodeIds: ['nodes/lesson.md', 'nodes/quiz.json'],
      },
      level: 1,
      maximumLevel: 1,
    });
  });

  it('defaults to bundleCompleted unlock and stays schema-valid', () => {
    const card = simpleKnowledgeCard('card-2', 'Squares', 'Four equal sides.');
    const result = CardDefinitionsSchema.safeParse({ cards: [card] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cards[0]!.unlock).toEqual({ type: 'bundleCompleted' });
    }
  });
});

describe('mergeRewardTrigger', () => {
  it('appends a new trigger when the event differs', () => {
    const first = mergeRewardTrigger(null, badgeOnWorkflowComplete('finish').triggers[0]!);
    const merged = mergeRewardTrigger(
      first,
      badgeOnQuizPass('quiz-star', 'nodes/q1.json').triggers[0]!,
    );
    expect(merged.triggers).toHaveLength(2);
    expect(merged.triggers.map((t) => t.onEvent)).toEqual(['workflow_complete', 'node_complete']);
    expect(RewardsSchema.safeParse(merged).success).toBe(true);
  });

  it('merges badges into an existing trigger and dedupes by badge name', () => {
    let doc = mergeRewardTrigger(null, badgeOnWorkflowComplete('star').triggers[0]!);
    doc = mergeRewardTrigger(doc, badgeOnWorkflowComplete('star').triggers[0]!);
    doc = mergeRewardTrigger(doc, badgeOnWorkflowComplete('moon').triggers[0]!);
    expect(doc.triggers).toHaveLength(1);
    expect(doc.triggers[0]!.rewards).toHaveLength(2);
    expect(
      doc.triggers[0]!.rewards.filter((r) => r.action === 'badge.award').map((r) => r.badge),
    ).toEqual(['star', 'moon']);
    expect(RewardsSchema.safeParse(doc).success).toBe(true);
  });

  it('keeps a null start usable and the merged document schema-valid', () => {
    const doc = mergeRewardTrigger(null, badgeOnWorkflowComplete('gold').triggers[0]!);
    expect(doc.triggers).toHaveLength(1);
    expect(RewardsSchema.safeParse(doc).success).toBe(true);
  });
});
