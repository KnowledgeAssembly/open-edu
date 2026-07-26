export type HintLevel = 1 | 2 | 3 | 4;

export interface HintRequest {
  currentLevel: HintLevel;
  requestedLevel: HintLevel;
  learnerHasAttempted: boolean;
  assessmentActive: boolean;
}

export function resolveHintLevel(req: HintRequest): HintLevel {
  if (req.assessmentActive && req.requestedLevel >= 4) return 3;

  const maxAllowed = Math.min(req.currentLevel + 1, 4) as HintLevel;
  if (req.requestedLevel > maxAllowed) return maxAllowed;

  if (req.requestedLevel === 4 && !req.learnerHasAttempted) return 3;

  return req.requestedLevel as HintLevel;
}

export const HINT_INSTRUCTIONS: Record<HintLevel, string> = {
  1: 'Provide a conceptual nudge. Point the learner toward the relevant concept or approach without revealing the solution. Ask a guiding question.',
  2: 'Provide a scaffolded hint. Give a high-level approach or partial strategy, but do not solve the problem. Suggest one technique or principle.',
  3: 'Provide a detailed walkthrough. Break the problem into steps and explain the reasoning at each step. The learner should still need to combine the steps themselves.',
  4: 'Provide a complete explanation. Walk through the full solution with reasoning. Confirm the learner attempted the problem first. Encourage reflection.',
};
