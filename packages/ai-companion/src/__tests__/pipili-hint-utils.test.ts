import { describe, it, expect } from 'vitest';
import { resolveHintLevel, HINT_INSTRUCTIONS } from '../pipili/hint-utils.js';
import type { HintRequest } from '../pipili/hint-utils.js';

describe('resolveHintLevel', () => {
  it('allows level 1 → 2 progression', () => {
    const req: HintRequest = {
      currentLevel: 1,
      requestedLevel: 2,
      learnerHasAttempted: false,
      assessmentActive: false,
    };
    expect(resolveHintLevel(req)).toBe(2);
  });

  it('allows level 2 → 3 progression', () => {
    const req: HintRequest = {
      currentLevel: 2,
      requestedLevel: 3,
      learnerHasAttempted: false,
      assessmentActive: false,
    };
    expect(resolveHintLevel(req)).toBe(3);
  });

  it('caps at currentLevel + 1 (cannot skip)', () => {
    const req: HintRequest = {
      currentLevel: 1,
      requestedLevel: 3,
      learnerHasAttempted: false,
      assessmentActive: false,
    };
    expect(resolveHintLevel(req)).toBe(2);
  });

  it('requires learnerHasAttempted for level 4', () => {
    const req: HintRequest = {
      currentLevel: 3,
      requestedLevel: 4,
      learnerHasAttempted: false,
      assessmentActive: false,
    };
    expect(resolveHintLevel(req)).toBe(3);
  });

  it('caps at level 3 during assessment', () => {
    const req: HintRequest = {
      currentLevel: 2,
      requestedLevel: 4,
      learnerHasAttempted: true,
      assessmentActive: true,
    };
    expect(resolveHintLevel(req)).toBe(3);
  });

  it('returns exact match when within bounds', () => {
    const req: HintRequest = {
      currentLevel: 2,
      requestedLevel: 2,
      learnerHasAttempted: false,
      assessmentActive: false,
    };
    expect(resolveHintLevel(req)).toBe(2);
  });

  it('HINT_INSTRUCTIONS has entries for all 4 levels', () => {
    expect(HINT_INSTRUCTIONS[1]).toBeDefined();
    expect(HINT_INSTRUCTIONS[2]).toBeDefined();
    expect(HINT_INSTRUCTIONS[3]).toBeDefined();
    expect(HINT_INSTRUCTIONS[4]).toBeDefined();
  });
});
