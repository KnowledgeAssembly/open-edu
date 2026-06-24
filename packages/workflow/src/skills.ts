import type { SkillGraph } from '@open-edu/schemas';

export interface SkillState {
  scores: Record<string, number>;
  achieved: Set<string>;
  maxScores: Record<string, number>;
}

export type MasteryLevel = 'not_attempted' | 'in_progress' | 'achieved' | 'mastered';

export interface SkillUpdatedEvent {
  type: 'SKILL_UPDATED';
  skillId: string;
  accumulatedScore: number;
  maxScore: number;
  masteryLevel: MasteryLevel;
}

export interface SkillAchievedEvent {
  type: 'SKILL_ACHIEVED';
  skillId: string;
  accumulatedScore: number;
  maxScore: number;
  masteryLevel: MasteryLevel;
}

export type SkillEvent = SkillUpdatedEvent | SkillAchievedEvent;

export function createSkillState(graph?: SkillGraph): SkillState {
  if (!graph) {
    return { scores: {}, achieved: new Set(), maxScores: {} };
  }
  const scores: Record<string, number> = {};
  const maxScores: Record<string, number> = {};
  for (const skill of graph.skills) {
    scores[skill.id] = 0;
    maxScores[skill.id] = Math.max(0, skill.maxScore ?? 100);
  }
  return { scores, achieved: new Set(), maxScores };
}

function computeMastery(ratio: number): MasteryLevel {
  if (ratio >= 0.9) return 'mastered';
  if (ratio >= 0.7) return 'achieved';
  if (ratio > 0) return 'in_progress';
  return 'not_attempted';
}

export function applyAssessment(
  state: SkillState,
  skillId: string,
  score: number | undefined,
  weight: number,
): { newState: SkillState; events: SkillEvent[] } {
  const events: SkillEvent[] = [];
  const safeScore = score ?? 0;
  const maxScore = state.maxScores[skillId] ?? 0;

  if (maxScore <= 0) {
    return { newState: state, events };
  }

  const prevTotal = state.scores[skillId] ?? 0;
  const contribution = safeScore * weight;
  const newTotal = prevTotal + contribution;

  const newScores = { ...state.scores, [skillId]: newTotal };
  const newAchieved = new Set(state.achieved);

  const ratio = newTotal / maxScore;
  const masteryLevel = computeMastery(ratio);

  const newState: SkillState = {
    scores: newScores,
    achieved: newAchieved,
    maxScores: state.maxScores,
  };

  events.push({
    type: 'SKILL_UPDATED',
    skillId,
    accumulatedScore: newTotal,
    maxScore,
    masteryLevel,
  });

  if (
    !state.achieved.has(skillId) &&
    (masteryLevel === 'achieved' || masteryLevel === 'mastered')
  ) {
    newAchieved.add(skillId);
    events.push({
      type: 'SKILL_ACHIEVED',
      skillId,
      accumulatedScore: newTotal,
      maxScore,
      masteryLevel,
    });
  }

  return { newState, events };
}
