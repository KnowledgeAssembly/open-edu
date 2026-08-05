import type { Workflow } from '@open-edu/schemas';

export interface ScoreBranchRule {
  afterPath: string;
  minScore: number;
  passPath: string;
  failPath: string;
}

export const SCORE_PATTERN: RegExp = /^score\s*(>=|<=|==|>|<)\s*(\d+)\s*$/;

const COMPLETED = 'COMPLETED';
const PASS_OPERATORS = new Set(['>=', '>']);
const FAIL_OPERATORS = new Set(['<', '<=']);

interface ParsedScoreCondition {
  op: string;
  threshold: number;
  then: string;
}

function parseScoreCondition(condition: { if: string; then: string }): ParsedScoreCondition | null {
  const match = SCORE_PATTERN.exec(condition.if);
  if (!match) return null;
  return { op: match[1] ?? '', threshold: Number(match[2]), then: condition.then };
}

function parsePairedConditions(
  conditions: Array<{ if: string; then: string }>,
): Omit<ScoreBranchRule, 'afterPath'> | null {
  if (conditions.length !== 2) return null;
  const [first, second] = conditions;
  if (!first || !second) return null;
  const a = parseScoreCondition(first);
  const b = parseScoreCondition(second);
  if (!a || !b || a.threshold !== b.threshold) return null;

  const aPass = PASS_OPERATORS.has(a.op);
  const aFail = FAIL_OPERATORS.has(a.op);
  const bPass = PASS_OPERATORS.has(b.op);
  const bFail = FAIL_OPERATORS.has(b.op);

  if (aPass && bFail) return { minScore: a.threshold, passPath: a.then, failPath: b.then };
  if (aFail && bPass) return { minScore: b.threshold, passPath: b.then, failPath: a.then };
  return null;
}

export function extractScoreBranches(workflow: Workflow): ScoreBranchRule[] {
  const rules: ScoreBranchRule[] = [];
  for (const [afterPath, route] of Object.entries(workflow.routing)) {
    const conditions = (route as { conditions?: Array<{ if: string; then: string }> }).conditions;
    if (!conditions || conditions.length !== 2) continue;
    const parsed = parsePairedConditions(conditions);
    if (parsed) rules.push({ afterPath, ...parsed });
  }
  return rules;
}

export function applyScoreBranch(workflow: Workflow, rule: ScoreBranchRule): Workflow {
  const minScore = Math.round(rule.minScore);
  return {
    routing: {
      ...workflow.routing,
      [rule.afterPath]: {
        conditions: [
          { if: `score >= ${minScore}`, then: rule.passPath },
          { if: `score < ${minScore}`, then: rule.failPath },
        ],
      },
    },
  };
}

export function clearScoreBranch(
  workflow: Workflow,
  afterPath: string,
  linearSuccessor?: string,
): Workflow {
  const successor = linearSuccessor ?? nextRoutingKey(workflow, afterPath);
  return {
    routing: {
      ...workflow.routing,
      [afterPath]: { onComplete: successor },
    },
  };
}

function nextRoutingKey(workflow: Workflow, afterPath: string): string {
  const keys = Object.keys(workflow.routing);
  const index = keys.indexOf(afterPath);
  return keys[index + 1] ?? COMPLETED;
}

export function outlineSuccessor(orderedPaths: string[], afterPath: string): string {
  const index = orderedPaths.indexOf(afterPath);
  return orderedPaths[index + 1] ?? COMPLETED;
}
