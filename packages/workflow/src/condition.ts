export interface ConditionResult {
  match: boolean;
  reason?: string;
}

const operators = ['>=', '<=', '==', '>', '<'] as const;

function parseSingleCondition(expr: string): (score: number) => ConditionResult {
  const trimmed = expr.trim();

  for (const op of operators) {
    const escapedOp = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^score\\s*${escapedOp}\\s*(\\d+)$`).exec(trimmed);
    if (match) {
      const threshold = Number(match[1]!);
      switch (op) {
        case '>=':
          return (score) => ({
            match: score >= threshold,
            reason: `score ${score} >= ${threshold}`,
          });
        case '<=':
          return (score) => ({
            match: score <= threshold,
            reason: `score ${score} <= ${threshold}`,
          });
        case '==':
          return (score) => ({
            match: score === threshold,
            reason: `score ${score} == ${threshold}`,
          });
        case '>':
          return (score) => ({
            match: score > threshold,
            reason: `score ${score} > ${threshold}`,
          });
        case '<':
          return (score) => ({
            match: score < threshold,
            reason: `score ${score} < ${threshold}`,
          });
      }
    }
  }

  return () => ({ match: false, reason: `Unparseable expression: ${expr}` });
}

export function evaluateCondition(expression: string, score: number): ConditionResult {
  const parts = expression.split('&&').map((s) => s.trim());

  if (parts.length === 1) {
    return parseSingleCondition(parts[0]!)(score);
  }

  for (const part of parts) {
    const result = parseSingleCondition(part)(score);
    if (!result.match) {
      return { match: false, reason: result.reason };
    }
  }

  return { match: true, reason: `All conditions met: ${expression}` };
}
