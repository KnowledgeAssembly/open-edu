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

describe('buildReadyCheck rewards + practice checks', () => {
  it('passes rewardsParse when rewards.json is absent', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({ 'nodes/lesson.md': '# Fractions' }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'rewardsParse')?.passed).toBe(true);
  });

  it('fails rewardsParse when rewards.json is present but invalid JSON', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({
        'nodes/lesson.md': '# Fractions',
        'rewards.json': '{ not json',
      }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'rewardsParse')?.passed).toBe(false);
  });

  it('passes rewardsParse when rewards.json parses', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({
        'nodes/lesson.md': '# Fractions',
        'rewards.json': JSON.stringify({ triggers: [] }),
      }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'rewardsParse')?.passed).toBe(true);
  });

  it('passes practiceWidgetValid when there are no practice nodes', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({ 'nodes/lesson.md': '# Fractions' }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'practiceWidgetValid')?.passed).toBe(true);
  });

  it('fails practiceWidgetValid for a practice node with an empty widget', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({
        'nodes/practice.json': JSON.stringify({ type: 'exercise', widget: '', config: {} }),
      }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'practiceWidgetValid')?.passed).toBe(false);
  });

  it('fails practiceWidgetValid for a practice node with a missing widget', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({
        'nodes/practice.json': JSON.stringify({ type: 'exercise', config: {} }),
      }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'practiceWidgetValid')?.passed).toBe(false);
  });

  it('passes practiceWidgetValid for a practice node with a widget', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({
        'nodes/practice.json': JSON.stringify({
          type: 'exercise',
          widget: 'core.multiple-choice',
          config: {},
        }),
      }),
      validationErrors: [],
    });
    expect(items.find((i) => i.id === 'practiceWidgetValid')?.passed).toBe(true);
  });

  it('applies the new checks before packageValid in a deterministic order', () => {
    const items = buildReadyCheck({
      title: 'Fractions',
      files: files({ 'nodes/lesson.md': '# Fractions' }),
      validationErrors: [],
    });
    const order = items.map((i) => i.id);
    expect(order).toEqual([
      'hasTitle',
      'hasActivity',
      'quizHasCorrect',
      'markdownHasHeading',
      'rewardsParse',
      'practiceWidgetValid',
      'packageValid',
    ]);
  });
});
