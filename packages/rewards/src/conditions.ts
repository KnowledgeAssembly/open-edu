import type { RewardCondition } from '@open-edu/schemas';
import type { ContextSnapshot } from './types';

export function evaluateCondition(condition: RewardCondition, context: ContextSnapshot): boolean {
  switch (condition.type) {
    case 'score': {
      const score = context.scores[condition.nodeId] ?? 0;
      return score >= condition.minScore;
    }
    case 'skill': {
      const level = context.skills[condition.skillId];
      if (!level) return false;
      if (condition.minLevel === 'mastered') return level === 'mastered';
      return level === 'achieved' || level === 'mastered';
    }
    case 'chain': {
      return condition.completedNodeIds.every((id: string) => context.completedNodes.includes(id));
    }
    case 'and': {
      return condition.conditions.every((c: RewardCondition) => evaluateCondition(c, context));
    }
    case 'or': {
      return condition.conditions.some((c: RewardCondition) => evaluateCondition(c, context));
    }
    case 'moduleCompleted': {
      return (context.completedModules ?? []).includes(condition.moduleId);
    }
    case 'bundleCompleted': {
      console.warn(
        '[rewards] bundleCompleted condition evaluated but bundle-level rewards require external wiring. ' +
          'Call rewardBroker.updateContext({ completedModules }) before firing bundle.completed event.',
      );
      return false;
    }
    default:
      return false;
  }
}

export function shouldFireAction(
  action: { condition?: RewardCondition },
  context: ContextSnapshot,
): boolean {
  if (!action.condition) return true;
  return evaluateCondition(action.condition, context);
}

export function getDefaultContext(): ContextSnapshot {
  return {
    scores: {},
    skills: {},
    completedNodes: [],
    completedModules: [],
  };
}
