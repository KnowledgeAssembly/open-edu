import type { CardDefinition, RewardCondition, Rewards, Trigger } from '@open-edu/schemas';

export function badgeOnWorkflowComplete(badgeName: string): Rewards {
  return {
    triggers: [
      {
        onEvent: 'workflow_complete',
        rewards: [{ action: 'badge.award', badge: badgeName }],
      },
    ],
  };
}

export function badgeOnQuizPass(badgeName: string, nodePath: string, minScore = 80): Rewards {
  return {
    triggers: [
      {
        onEvent: 'node_complete',
        rewards: [
          {
            action: 'badge.award',
            badge: badgeName,
            condition: { type: 'score', nodeId: nodePath, minScore },
          },
        ],
      },
    ],
  };
}

export function simpleKnowledgeCard(
  id: string,
  title: string,
  body: string,
  unlock?: RewardCondition,
): CardDefinition {
  return {
    id,
    title,
    category: 'Knowledge',
    type: 'knowledge',
    summary: body,
    unlock: unlock ?? { type: 'bundleCompleted' },
    level: 1,
    maximumLevel: 1,
  };
}

export function mergeRewardTrigger(existing: Rewards | null, trigger: Trigger): Rewards {
  const triggers = existing?.triggers ?? [];
  const matchIndex = triggers.findIndex((item) => item.onEvent === trigger.onEvent);
  if (matchIndex === -1) {
    return { triggers: [...triggers, trigger] };
  }
  const mergedRewards = [...triggers[matchIndex]!.rewards];
  for (const reward of trigger.rewards) {
    const duplicate =
      reward.action === 'badge.award' &&
      mergedRewards.some(
        (existingReward) =>
          existingReward.action === 'badge.award' && existingReward.badge === reward.badge,
      );
    if (!duplicate) mergedRewards.push(reward);
  }
  const next = [...triggers];
  next[matchIndex] = { ...triggers[matchIndex]!, rewards: mergedRewards };
  return { triggers: next };
}
