import { describe, it, expect } from 'vitest';
import { evaluateCondition } from './condition';

describe('evaluateCondition', () => {
  it('should evaluate score >= threshold', () => {
    expect(evaluateCondition('score >= 80', 85).match).toBe(true);
    expect(evaluateCondition('score >= 80', 80).match).toBe(true);
    expect(evaluateCondition('score >= 80', 79).match).toBe(false);
  });

  it('should evaluate score > threshold', () => {
    expect(evaluateCondition('score > 80', 81).match).toBe(true);
    expect(evaluateCondition('score > 80', 80).match).toBe(false);
  });

  it('should evaluate score <= threshold', () => {
    expect(evaluateCondition('score <= 80', 79).match).toBe(true);
    expect(evaluateCondition('score <= 80', 80).match).toBe(true);
    expect(evaluateCondition('score <= 80', 81).match).toBe(false);
  });

  it('should evaluate score < threshold', () => {
    expect(evaluateCondition('score < 80', 79).match).toBe(true);
    expect(evaluateCondition('score < 80', 80).match).toBe(false);
  });

  it('should evaluate score == threshold', () => {
    expect(evaluateCondition('score == 80', 80).match).toBe(true);
    expect(evaluateCondition('score == 80', 81).match).toBe(false);
  });

  it('should evaluate compound conditions with &&', () => {
    expect(evaluateCondition('score >= 80 && score < 90', 85).match).toBe(true);
    expect(evaluateCondition('score >= 80 && score < 90', 95).match).toBe(false);
    expect(evaluateCondition('score >= 80 && score < 90', 75).match).toBe(false);
  });

  it('should handle whitespace in expressions', () => {
    expect(evaluateCondition('  score  >=  80  ', 85).match).toBe(true);
  });

  it('should return false for unparseable expressions', () => {
    const result = evaluateCondition('invalid expression', 50);
    expect(result.match).toBe(false);
    expect(result.reason).toContain('Unparseable');
  });

  it('should provide reason for match', () => {
    const result = evaluateCondition('score >= 80', 85);
    expect(result.match).toBe(true);
    expect(result.reason).toContain('score 85 >= 80');
  });

  it('should provide reason for compound match', () => {
    const result = evaluateCondition('score >= 80 && score < 90', 85);
    expect(result.match).toBe(true);
    expect(result.reason).toContain('All conditions met');
  });
});
