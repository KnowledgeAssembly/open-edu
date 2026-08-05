import { describe, it, expect } from 'vitest';
import { buildReadyCheck, isReadyToExport } from './readyCheck';

function files(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

describe('buildReadyCheck', () => {
  it('empty package fails every check', () => {
    const items = buildReadyCheck({ title: '', files: files({}), validationErrors: [] });
    expect(items.every((i) => i.passed)).toBe(false);
    expect(items.find((i) => i.id === 'hasTitle')?.passed).toBe(false);
    expect(items.find((i) => i.id === 'hasActivity')?.passed).toBe(false);
    expect(isReadyToExport(items)).toBe(false);
  });

  it('valid lesson + quiz passes', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({
        'nodes/lesson.md': '# Fractions\n\nHello',
        'nodes/quiz.json': JSON.stringify({
          type: 'quiz',
          question: 'Q?',
          options: [
            { id: 'a', text: 'A', correct: true },
            { id: 'b', text: 'B', correct: false },
          ],
        }),
      }),
      validationErrors: [],
    });
    expect(items.every((i) => i.passed)).toBe(true);
    expect(isReadyToExport(items)).toBe(true);
  });

  it('quiz without correct answer fails', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({
        'nodes/quiz.json': JSON.stringify({
          type: 'quiz',
          question: 'Q?',
          options: [
            { id: 'a', text: 'A', correct: false },
            { id: 'b', text: 'B', correct: false },
          ],
        }),
      }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'quizHasCorrect')?.passed).toBe(false);
    expect(isReadyToExport(items)).toBe(false);
  });

  it('lesson without heading fails markdown check', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({ 'nodes/lesson.md': 'No heading here' }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'markdownHasHeading')?.passed).toBe(false);
  });

  it('reports validation errors as failing package valid check', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({ 'nodes/lesson.md': '# Fine' }),
      validationErrors: [{ path: 'workflow.json', error: 'Invalid routing' }],
    });
    expect(items.find((i) => i.id === 'packageValid')?.passed).toBe(false);
    expect(items.find((i) => i.id === 'packageValid')?.detail).toBe('Invalid routing');
  });

  it('ignores non-node files when counting activities', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({ 'package.json': '{}', 'assets/img.png': '' }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'hasActivity')?.passed).toBe(false);
  });
});
