import { describe, it, expect } from 'vitest';
import { encodeStateName, decodeStateName } from './state-map';

describe('encodeStateName', () => {
  it('should replace slashes with underscores', () => {
    expect(encodeStateName('nodes/lesson-01.md')).toBe('nodes_lesson_01_md');
  });

  it('should replace dots with underscores', () => {
    expect(encodeStateName('file.json')).toBe('file_json');
  });

  it('should replace hyphens with underscores', () => {
    expect(encodeStateName('lesson-01')).toBe('lesson_01');
  });

  it('should handle complex paths', () => {
    expect(encodeStateName('nodes/sub/quiz-01.final.json')).toBe('nodes_sub_quiz_01_final_json');
  });
});

describe('decodeStateName', () => {
  it('should decode an encoded state back to original path', () => {
    const paths = ['nodes/lesson-01.md', 'nodes/quiz-01.json'];
    const encoded = encodeStateName('nodes/lesson-01.md');
    expect(decodeStateName(encoded, paths)).toBe('nodes/lesson-01.md');
  });

  it('should return the encoded value if no match found', () => {
    expect(decodeStateName('unknown_state', [])).toBe('unknown_state');
  });

  it('should decode from a map of original paths', () => {
    const paths = ['nodes/a.md', 'nodes/b.json', 'COMPLETED'];
    expect(decodeStateName('COMPLETED', paths)).toBe('COMPLETED');
  });
});
