import { describe, it, expect } from 'vitest';
import { encodeStateName, decodeStateName } from './state-map';

describe('encodeStateName', () => {
  it('escapes dots so the result is a valid XState state key', () => {
    expect(encodeStateName('nodes/lesson-01.md')).toBe('nodes/lesson-01\u0000md');
  });

  it('preserves slashes and hyphens (they are valid in XState state keys)', () => {
    expect(encodeStateName('nodes/sub/lesson-01')).toBe('nodes/sub/lesson-01');
  });

  it('escapes every dot in a multi-extension path', () => {
    expect(encodeStateName('nodes/sub/quiz-01.final.json')).toBe(
      'nodes/sub/quiz-01\u0000final\u0000json',
    );
  });
});

describe('decodeStateName', () => {
  it('reverses encodeStateName', () => {
    const path = 'nodes/sub/quiz-01.final.json';
    expect(decodeStateName(encodeStateName(path))).toBe(path);
  });

  it('passes through values that contain no escape characters', () => {
    expect(decodeStateName('COMPLETED')).toBe('COMPLETED');
    expect(decodeStateName('nodes/lesson-01')).toBe('nodes/lesson-01');
  });
});

describe('injectivity (no collisions)', () => {
  it('distinct paths never encode to the same value', () => {
    const paths = [
      'nodes/a-b.md',
      'nodes/a.b.md',
      'nodes/a_b.md',
      'nodes/a/b.md',
      'nodes/a-b',
      'nodes/a.b',
      'nodes/a_b',
    ];
    const encoded = paths.map(encodeStateName);
    expect(new Set(encoded).size).toBe(encoded.length);
  });
});
