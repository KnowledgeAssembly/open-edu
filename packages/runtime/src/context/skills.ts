import type { SkillGraph, SkillDefinition, MasteryLevel } from '@open-edu/schemas';

export function computeSkillScores(
  nodeScores: Record<string, number>,
  skillGraph?: SkillGraph,
): Record<string, number> {
  if (!skillGraph || !skillGraph.assessments || skillGraph.assessments.length === 0) {
    return {};
  }

  const weightedScores: Record<string, { total: number; totalWeight: number }> = {};

  for (const assessment of skillGraph.assessments) {
    const nodeScore = nodeScores[assessment.nodeId];
    if (nodeScore === undefined) continue;

    const entry = weightedScores[assessment.skillId];
    if (entry) {
      entry.total += nodeScore * assessment.weight;
      entry.totalWeight += assessment.weight;
    } else {
      weightedScores[assessment.skillId] = {
        total: nodeScore * assessment.weight,
        totalWeight: assessment.weight,
      };
    }
  }

  const result: Record<string, number> = {};
  for (const [skillId, data] of Object.entries(weightedScores)) {
    result[skillId] = data.totalWeight > 0 ? Math.round(data.total / data.totalWeight) : 0;
  }

  return result;
}

export function getSkillMastery(score: number, _skill?: SkillDefinition): MasteryLevel {
  if (score >= 90) return 'mastered';
  if (score >= 75) return 'achieved';
  if (score >= 50) return 'in_progress';
  return 'not_attempted';
}

export function getMasteryLabel(mastery: MasteryLevel): string {
  const labels: Record<MasteryLevel, string> = {
    not_attempted: 'Not Attempted',
    in_progress: 'In Progress',
    achieved: 'Achieved',
    mastered: 'Mastered',
  };
  return labels[mastery];
}

export function getMasteryColor(mastery: MasteryLevel): string {
  const colors: Record<MasteryLevel, string> = {
    not_attempted: '#9ca3af',
    in_progress: '#3b82f6',
    achieved: '#8b5cf6',
    mastered: '#10b981',
  };
  return colors[mastery];
}
