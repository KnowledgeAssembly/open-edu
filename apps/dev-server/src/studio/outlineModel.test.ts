import { describe, it, expect } from 'vitest';
import {
  detectActivityKind,
  buildLinearWorkflow,
  activitiesFromEntryOrder,
  titleFromMarkdown,
  titleFromQuizJson,
  titleFromReflectionJson,
} from './outlineModel';
import { WorkflowSchema } from '@open-edu/schemas';

describe('outlineModel', () => {
  it('detects lesson vs quiz by extension/content', () => {
    expect(detectActivityKind('nodes/intro.md', '# Hi')).toBe('lesson');
    expect(detectActivityKind('nodes/q1.json', '{"type":"quiz","question":"Q","options":[]}')).toBe(
      'quiz',
    );
    expect(detectActivityKind('nodes/p.json', '{"type":"widget","widget":"flashcard"}')).toBe(
      'practice',
    );
    expect(detectActivityKind('nodes/w.json', '{"type":"custom","widget":"flashcard"}')).toBe(
      'practice',
    );
    expect(
      detectActivityKind('nodes/r.json', '{"type":"reflection","prompt":"What did you notice?"}'),
    ).toBe('reflection');
    expect(detectActivityKind('nodes/x.json', 'not json')).toBe('other');
  });

  it('builds linear workflow from ordered paths using onComplete routing', () => {
    const wf = buildLinearWorkflow(['nodes/a.md', 'nodes/b.json'], 'nodes/a.md');
    expect(wf.entry).toBe('nodes/a.md');
    expect(wf.routing['nodes/a.md']).toEqual({ onComplete: 'nodes/b.json' });
    expect(wf.routing['nodes/b.json']).toEqual({ onComplete: 'COMPLETED' });
  });

  it('produces a workflow that satisfies WorkflowSchema', () => {
    const wf = buildLinearWorkflow(['nodes/a.md', 'nodes/b.json'], 'nodes/a.md');
    const result = WorkflowSchema.safeParse({ routing: wf.routing });
    expect(result.success).toBe(true);
  });

  it('falls back to first path as entry when entry is missing', () => {
    const wf = buildLinearWorkflow(['nodes/a.md', 'nodes/b.json'], 'nodes/missing.md');
    expect(wf.entry).toBe('nodes/a.md');
  });

  it('builds a single-node workflow terminating in COMPLETED', () => {
    const wf = buildLinearWorkflow(['nodes/only.md'], 'nodes/only.md');
    expect(wf.routing['nodes/only.md']).toEqual({ onComplete: 'COMPLETED' });
  });

  it('extracts titles', () => {
    expect(titleFromMarkdown('# Fractions\n\nHello')).toBe('Fractions');
    expect(titleFromQuizJson('{"type":"quiz","question":"What is 1/2?","options":[]}')).toBe(
      'What is 1/2?',
    );
  });

  it('extracts reflection titles from explicit title first, then prompt excerpt', () => {
    expect(
      titleFromReflectionJson('{"type":"reflection","title":"Reflect","prompt":"Think."}'),
    ).toBe('Reflect');
    expect(titleFromReflectionJson('{"type":"reflection","prompt":"What did you notice?"}')).toBe(
      'What did you notice?',
    );
    expect(titleFromReflectionJson('not json')).toBe('Untitled reflection');
  });

  it('derives reflection activity summaries from ordered paths', () => {
    const files = new Map([
      ['nodes/a.md', '# Intro'],
      ['nodes/r.json', '{"type":"reflection","prompt":"What did you notice?"}'],
    ]);
    const summaries = activitiesFromEntryOrder(['nodes/a.md', 'nodes/r.json'], files);
    expect(summaries).toEqual([
      { id: 'nodes/a.md', path: 'nodes/a.md', title: 'Intro', kind: 'lesson' },
      {
        id: 'nodes/r.json',
        path: 'nodes/r.json',
        title: 'What did you notice?',
        kind: 'reflection',
      },
    ]);
  });
});
