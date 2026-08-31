import { describe, it, expect } from 'vitest';
import { studioContextSnapshotSchema } from './context.js';

describe('companion context contract', () => {
  it('parses a minimal studio snapshot', () => {
    const parsed = studioContextSnapshotSchema.parse({
      view: 'outline',
      locale: 'en',
      aiAvailable: true,
    });
    expect(parsed.view).toBe('outline');
  });

  it('parses a snapshot with course and activity', () => {
    const parsed = studioContextSnapshotSchema.parse({
      view: 'edit-activity',
      locale: 'en',
      aiAvailable: true,
      course: {
        id: 'c1',
        title: 'Fractions',
        activityCount: 1,
        outline: [{ title: 'Intro', kind: 'lesson', path: 'nodes/intro.md' }],
      },
      activity: {
        path: 'nodes/intro.md',
        kind: 'lesson',
        title: 'Intro',
        contentExcerpt: '# Intro',
      },
    });
    expect(parsed.course?.activityCount).toBe(1);
  });
});
