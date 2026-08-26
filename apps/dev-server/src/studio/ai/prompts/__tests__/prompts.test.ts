import { describe, it, expect, vi } from 'vitest';
import {
  buildLessonAddPrompt,
  buildQuizAddPrompt,
  buildPracticeAddPrompt,
  buildLessonEditPrompt,
  buildQuizEditPrompt,
  buildPracticeEditPrompt,
} from '../index.js';

vi.mock('../../../widgets/curatedCatalog.js', () => ({
  listCuratedWidgets: () => [
    {
      id: 'core.multiple-choice',
      name: 'Multiple Choice',
      domain: 'core',
      source: 'builtin',
      trustTier: 'native',
      version: '1.2.0',
      offline: false,
      status: 'stable',
      guide: {
        configFields: [{ name: 'questions', type: 'array', required: true, description: '' }],
      },
    },
  ],
}));

describe('item add prompts', () => {
  it('lesson add prompt contains the description and heading rule', () => {
    const prompt = buildLessonAddPrompt('Explain fractions with pizza slices', '');
    expect(prompt).toContain('Explain fractions with pizza slices');
    expect(prompt).toMatch(/Output ONLY a single JSON object/);
    expect(prompt).toMatch(/# "/);
    expect(prompt).toMatch(/"markdown"/);
  });

  it('quiz add prompt enforces exactly four options with one correct', () => {
    const prompt = buildQuizAddPrompt('Check adding like-denominator fractions', '');
    expect(prompt).toContain('Check adding like-denominator fractions');
    expect(prompt).toMatch(/Exactly 4 options/);
    expect(prompt).toMatch(/"correct": true/);
  });

  it('practice add prompt includes the catalog section', () => {
    const prompt = buildPracticeAddPrompt('Practice identifying fractions', '');
    expect(prompt).toContain('Practice identifying fractions');
    expect(prompt).toContain('AVAILABLE WIDGETS');
    expect(prompt).toContain(
      'AVAILABLE WIDGETS (id | name | source | trust | version | offline | status)',
    );
    expect(prompt).toContain('core.multiple-choice');
  });

  it('prompts inject the course context when present', () => {
    const context = 'EXISTING COURSE ITEMS:\n1. Intro lesson';
    const prompt = buildQuizAddPrompt('A question', context);
    expect(prompt).toContain('EXISTING COURSE ITEMS');
    expect(prompt).toContain('Intro lesson');
  });
});

describe('item edit prompts', () => {
  it('lesson edit prompt contains the current content and intent', () => {
    const prompt = buildLessonEditPrompt('rewrite', '# Fractions\n\nBody', '');
    expect(prompt).toContain('# Fractions\n\nBody');
    expect(prompt).toMatch(/Rewrite/i);
    expect(prompt).toMatch(/"markdown"/);
  });

  it('quiz edit prompt preserves the source option count', () => {
    const prompt = buildQuizEditPrompt('rewrite', '{"question":"Q?"}', 5, '');
    expect(prompt).toContain('exactly 5 options');
  });

  it('add-questions edit prompt returns a batch of three', () => {
    const prompt = buildQuizEditPrompt('add-questions', '{"question":"Q?"}', 4, '');
    expect(prompt).toMatch(/exactly 3 new quiz questions/);
    expect(prompt).toContain('"questions"');
  });

  it('difficulty prompt includes easier/harder from params', () => {
    const prompt = buildLessonEditPrompt('difficulty', '# Fractions', '', { direction: 'harder' });
    expect(prompt).toMatch(/harder/i);
    expect(prompt).toContain('Make it harder');
  });

  it('translate prompt includes the target locale', () => {
    const prompt = buildLessonEditPrompt('translate', '# Fractions', '', { targetLocale: 'es' });
    expect(prompt).toContain('es');
  });

  it('practice edit prompt includes the catalog section', () => {
    const prompt = buildPracticeEditPrompt('improve-prompt', '{"type":"exercise"}', '');
    expect(prompt).toContain('AVAILABLE WIDGETS');
    expect(prompt).toContain('core.multiple-choice');
  });
});
