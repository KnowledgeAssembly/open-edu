import { describe, it, expect } from 'vitest';
import {
  isOepCourse,
  storedCourseToPackageSummary,
  storedCourseToLoadedPackage,
  storedBundleToLoadedBundle,
} from '../oepAdapters';
import type { StoredCourse, StoredBundle } from '@open-edu/storage';

function makeStoredCourse(overrides: Partial<StoredCourse> = {}): StoredCourse {
  return {
    id: 'test-course',
    version: '1.0.0',
    manifest: {
      id: 'test-course',
      title: 'Test Course',
      version: '1.0.0',
      author: 'Test Author',
      entry: 'nodes/intro.md',
    },
    nodes: [
      { relativePath: 'nodes/intro.md', content: '# Hello\n\nWorld' },
      {
        relativePath: 'nodes/quiz.json',
        content: JSON.stringify({
          type: 'quiz',
          title: 'Quiz 1',
          question: 'What?',
          options: [
            { id: 'a', text: 'A', correct: true },
            { id: 'b', text: 'B', correct: false },
          ],
        }),
      },
    ],
    assets: [{ path: 'assets/img.png', data: new ArrayBuffer(8) }],
    downloadedAt: '2026-07-27T00:00:00Z',
    ...overrides,
  };
}

function makeStoredBundle(overrides: Partial<StoredBundle> = {}): StoredBundle {
  return {
    id: 'test-bundle',
    version: '1.0.0',
    bundleManifest: {
      id: 'test-bundle',
      title: 'Test Bundle',
      version: '1.0.0',
      author: 'Test Author',
      type: 'bundle',
      modules: [{ id: 'mod-a', title: 'Module A', path: './modules/mod-a', dependsOn: [] }],
    },
    modules: [
      {
        manifest: {
          id: 'mod-a',
          title: 'Module A',
          version: '1.0.0',
          author: 'Test Author',
          entry: 'nodes/intro.md',
        },
        nodes: [{ relativePath: 'nodes/intro.md', content: '# Hello\n\nWorld' }],
        assets: [{ path: 'assets/img.png', data: new ArrayBuffer(8) }],
      },
    ],
    downloadedAt: '2026-07-27T00:00:00Z',
    ...overrides,
  };
}

describe('isOepCourse', () => {
  it('returns true for oep:// prefix', () => {
    expect(isOepCourse('oep://my-course')).toBe(true);
  });

  it('returns false for non-oep paths', () => {
    expect(isOepCourse('/test/courses/my-course')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isOepCourse('')).toBe(false);
  });
});

describe('storedCourseToPackageSummary', () => {
  it('converts a valid stored course to a package summary', () => {
    const course = makeStoredCourse();
    const summary = storedCourseToPackageSummary(course);

    expect(summary.manifest.id).toBe('test-course');
    expect(summary.manifest.title).toBe('Test Course');
    expect(summary.nodeCount).toBe(2);
    expect(summary.availableBadges).toBe(0);
    expect(summary.rootDir).toBe('oep://test-course');
  });

  it('falls back to course.id as title when manifest parse fails', () => {
    const course = makeStoredCourse({ manifest: { notAManifest: true } });
    const summary = storedCourseToPackageSummary(course);

    expect(summary.manifest.id).toBe('test-course');
    expect(summary.manifest.title).toBe('test-course');
  });

  it('counts badge rewards from rewards triggers', () => {
    const course = makeStoredCourse({
      rewards: {
        triggers: [
          {
            onEvent: 'lesson.complete',
            rewards: [
              { action: 'badge.award', badge: 'b1' },
              { action: 'webhook', url: 'https://example.com' },
            ],
          },
          { onEvent: 'quiz.complete', rewards: [{ action: 'badge.award', badge: 'b2' }] },
        ],
      },
    });
    const summary = storedCourseToPackageSummary(course);
    expect(summary.availableBadges).toBe(2);
  });

  it('returns 0 badges when rewards is null', () => {
    const course = makeStoredCourse({ rewards: undefined });
    const summary = storedCourseToPackageSummary(course);
    expect(summary.availableBadges).toBe(0);
  });

  it('returns 0 badges when rewards parse fails', () => {
    const course = makeStoredCourse({ rewards: { invalid: true } });
    const summary = storedCourseToPackageSummary(course);
    expect(summary.availableBadges).toBe(0);
  });
});

describe('storedCourseToLoadedPackage', () => {
  it('converts a valid stored course to a loaded package', () => {
    const course = makeStoredCourse();
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.rootDir).toBe('oep://test-course');
    expect(loaded.manifest.id).toBe('test-course');
    expect(loaded.manifest.title).toBe('Test Course');
    expect(loaded.nodes).toHaveLength(2);
    expect(loaded.assetPaths).toEqual(['img.png']);
    expect(loaded.workflow).toBeNull();
    expect(loaded.rewards).toBeNull();
    expect(loaded.cards).toBeNull();
  });

  it('sets node paths with oep:// prefix', () => {
    const course = makeStoredCourse();
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.nodes[0]!.path).toBe('oep://test-course/nodes/intro.md');
    expect(loaded.nodes[0]!.relativePath).toBe('nodes/intro.md');
    expect(loaded.nodes[1]!.path).toBe('oep://test-course/nodes/quiz.json');
  });

  it('parses .md node content as lesson type with extracted title', () => {
    const course = makeStoredCourse();
    const loaded = storedCourseToLoadedPackage(course);

    const mdNode = loaded.nodes.find((n) => n.relativePath === 'nodes/intro.md');
    expect(mdNode!.node.type).toBe('lesson');
    expect(mdNode!.node.title).toBe('Hello');
  });

  it('parses .json node content via ContentNodeSchema', () => {
    const course = makeStoredCourse();
    const loaded = storedCourseToLoadedPackage(course);

    const jsonNode = loaded.nodes.find((n) => n.relativePath === 'nodes/quiz.json');
    expect(jsonNode!.node.type).toBe('quiz');
    expect(jsonNode!.node.title).toBe('Quiz 1');
  });

  it('falls back to lesson type for invalid JSON nodes', () => {
    const course = makeStoredCourse({
      nodes: [{ relativePath: 'nodes/bad.json', content: 'not json' }],
    });
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.nodes[0]!.node.type).toBe('lesson');
  });

  it('parses workflow when provided', () => {
    const workflow = {
      routing: {
        start: { onComplete: 'step1' },
        step1: { conditions: [{ if: 'score > 80', then: 'done' }] },
      },
    };
    const course = makeStoredCourse({ workflow });
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.workflow).toEqual(workflow);
  });

  it('parses rewards when provided', () => {
    const rewards = {
      triggers: [{ onEvent: 'lesson.complete', rewards: [{ action: 'badge.award', badge: 'b1' }] }],
    };
    const course = makeStoredCourse({ rewards });
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.rewards).toEqual(rewards);
  });

  it('parses cards when provided', () => {
    const cards = {
      cards: [
        {
          id: 'c1',
          title: 'Card',
          category: 'General',
          type: 'knowledge',
          summary: 'A card',
          unlock: { type: 'bundleCompleted' },
        },
      ],
    };
    const course = makeStoredCourse({ cards });
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.cards).toEqual({
      cards: [
        {
          id: 'c1',
          title: 'Card',
          category: 'General',
          type: 'knowledge',
          summary: 'A card',
          level: 1,
          maximumLevel: 1,
          unlock: { type: 'bundleCompleted' },
        },
      ],
    });
  });

  it('returns null for invalid workflow/rewards/cards', () => {
    const course = makeStoredCourse({
      workflow: { invalid: true },
      rewards: { invalid: true },
      cards: { invalid: true },
    });
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.workflow).toBeNull();
    expect(loaded.rewards).toBeNull();
    expect(loaded.cards).toBeNull();
  });

  it('falls back manifest on parse failure', () => {
    const course = makeStoredCourse({ manifest: { notAManifest: true } });
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.manifest.id).toBe('test-course');
    expect(loaded.manifest.title).toBe('test-course');
    expect(loaded.manifest.author).toBe('');
    expect(loaded.manifest.entry).toBe('nodes/intro.md');
  });

  it('returns empty assetPaths for courses with no assets', () => {
    const course = makeStoredCourse({ assets: [] });
    const loaded = storedCourseToLoadedPackage(course);

    expect(loaded.assetPaths).toEqual([]);
  });
});

describe('storedBundleToLoadedBundle', () => {
  it('maps a stored bundle to a loaded bundle', () => {
    const stored = makeStoredBundle();
    const loaded = storedBundleToLoadedBundle(stored);

    expect(loaded.manifest.id).toBe('test-bundle');
    expect(loaded.modules).toHaveLength(1);
    expect(loaded.rewards).toBeNull();
    expect(loaded.cards).toBeNull();
  });

  it('maps bundle-level rewards and cards from storage', () => {
    const stored = makeStoredBundle({
      rewards: {
        triggers: [
          { onEvent: 'bundle_complete', rewards: [{ action: 'badge.award', badge: 'b1' }] },
        ],
      },
      cards: {
        cards: [
          {
            id: 'bundle-card',
            title: 'Bundle Card',
            category: 'General',
            type: 'achievement',
            summary: 'A bundle card',
            unlock: { type: 'bundleCompleted' },
          },
        ],
      },
    });
    const loaded = storedBundleToLoadedBundle(stored);
    expect(loaded.rewards).toEqual({
      triggers: [{ onEvent: 'bundle_complete', rewards: [{ action: 'badge.award', badge: 'b1' }] }],
    });
    expect(loaded.cards!.cards[0]!.id).toBe('bundle-card');
  });

  it('defaults missing bundle rewards/cards to null', () => {
    const stored = makeStoredBundle({});
    const loaded = storedBundleToLoadedBundle(stored);
    expect(loaded.rewards).toBeNull();
    expect(loaded.cards).toBeNull();
  });

  it('returns null for invalid bundle rewards/cards', () => {
    const stored = makeStoredBundle({ rewards: { invalid: true }, cards: { invalid: true } });
    const loaded = storedBundleToLoadedBundle(stored);
    expect(loaded.rewards).toBeNull();
    expect(loaded.cards).toBeNull();
  });
});
