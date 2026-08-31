import { describe, it, expect } from 'vitest';
import { routeIntent } from './route.js';
import type { StudioContextSnapshot } from '@open-edu/companion/context';

const ctx: StudioContextSnapshot = {
  view: 'outline',
  locale: 'en',
  aiAvailable: true,
  course: {
    id: 'c1',
    title: 'Fractions',
    activityCount: 2,
    outline: [
      { title: 'A', kind: 'lesson', path: 'nodes/a.md' },
      { title: 'B', kind: 'quiz', path: 'nodes/b.json' },
    ],
  },
};

describe('routeIntent', () => {
  it('routes course generation', () => {
    expect(routeIntent({ type: 'generate_course', description: 'math' }, ctx)).toEqual({
      tool: 'generate_course',
      description: 'math',
    });
  });

  it('routes new item drafts', () => {
    expect(routeIntent({ type: 'draft_new', kind: 'quiz', description: 'a quiz' }, ctx)).toEqual({
      tool: 'generate_item',
      kind: 'quiz',
      description: 'a quiz',
    });
  });

  it('routes edits only when an activity is open', () => {
    expect(routeIntent({ type: 'edit_existing', intent: 'rewrite' }, ctx)).toEqual({
      tool: 'explain',
    });

    const withActivity: StudioContextSnapshot = {
      ...ctx,
      activity: { path: 'nodes/a.md', kind: 'lesson', contentExcerpt: '# Hi' },
    };
    expect(routeIntent({ type: 'edit_existing', intent: 'rewrite' }, withActivity)).toEqual({
      tool: 'edit_item',
      kind: 'lesson',
      intent: 'rewrite',
      currentContent: '# Hi',
    });
  });

  it('falls back to explain for unknown messages', () => {
    expect(routeIntent(null, ctx)).toEqual({ tool: 'explain' });
  });
});
