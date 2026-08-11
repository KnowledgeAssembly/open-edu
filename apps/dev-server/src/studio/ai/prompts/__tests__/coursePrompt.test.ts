import { describe, it, expect, vi } from 'vitest';
import { buildCourseSpecPrompt } from '../coursePrompt.js';
import { extractJsonObject } from '../extract.js';

vi.mock('../../../widgets/curatedCatalog.js', () => ({
  listCuratedWidgets: () => [
    {
      id: 'core.multiple-choice',
      name: 'Multiple Choice',
      domain: 'core',
      guide: { configFields: [] },
    },
    { id: 'core.matching', name: 'Matching', domain: 'core', guide: { configFields: [] } },
  ],
}));

describe('coursePrompt', () => {
  it('includes the teacher notes text', () => {
    const prompt = buildCourseSpecPrompt('Fractions for grade 4 students');
    expect(prompt).toContain('Fractions for grade 4 students');
  });

  it('asks for only course-spec compatible JSON', () => {
    const prompt = buildCourseSpecPrompt('notes');
    expect(prompt).toContain('"format": "openedu-course-spec"');
    expect(prompt).toContain('"lessons"');
    expect(prompt).toMatch(/Output ONLY a single JSON object/);
  });

  it('constrains lesson count and objectives style for teachers', () => {
    const prompt = buildCourseSpecPrompt('notes');
    expect(prompt).toMatch(/1 to 6 lessons/);
    expect(prompt).toMatch(/measurable objective/);
    expect(prompt).toMatch(/never "understand", "know", or "learn"/);
  });

  it('injects the live widget catalog instead of hardcoded widget ids', () => {
    const prompt = buildCourseSpecPrompt('notes');
    expect(prompt).toContain('AVAILABLE WIDGETS');
    expect(prompt).toContain('core.multiple-choice');
    expect(prompt).toContain('core.matching');
  });
});

describe('extractJsonObject', () => {
  it('parses a plain JSON object', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown code fences', () => {
    const text = 'Here you go:\n```json\n{"format":"openedu-course-spec"}\n```';
    expect(extractJsonObject(text)).toEqual({ format: 'openedu-course-spec' });
  });

  it('extracts the first JSON object from surrounding prose', () => {
    const text = 'Sure! { "title": "Fractions" } done.';
    expect(extractJsonObject(text)).toEqual({ title: 'Fractions' });
  });

  it('throws when no JSON object is present', () => {
    expect(() => extractJsonObject('no json here')).toThrow(/No JSON object/);
  });
});
