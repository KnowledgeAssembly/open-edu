import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetBundle } from '../resetBundleStorage';
import type { LoadedBundle } from '@open-edu/core';

vi.mock('@open-edu/storage', () => ({
  deleteCourseProgress: vi.fn().mockResolvedValue(undefined),
  deleteBadges: vi.fn().mockResolvedValue(undefined),
  deleteAllCards: vi.fn().mockResolvedValue(undefined),
  deleteNotesByCourse: vi.fn().mockResolvedValue(undefined),
}));

import {
  deleteCourseProgress,
  deleteBadges,
  deleteAllCards,
  deleteNotesByCourse,
} from '@open-edu/storage';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeBundle(moduleIds: string[]): LoadedBundle {
  return {
    rootDir: '/bundles/test',
    manifest: {
      id: 'test-bundle',
      type: 'bundle',
      title: 'Test Bundle',
      version: '1.0.0',
      author: 'test',
      modules: moduleIds.map((id) => ({
        id,
        title: `Module ${id}`,
        path: `/modules/${id}`,
        dependsOn: [],
      })),
    },
    modules: [],
    moduleMap: new Map(),
  } as unknown as LoadedBundle;
}

describe('resetBundle', () => {
  it('deletes bundle progress and all module progress/badges/notes and cards', async () => {
    const bundle = makeBundle(['mod-a', 'mod-b']);

    await resetBundle(bundle);

    expect(deleteCourseProgress).toHaveBeenCalledWith('test-bundle');
    expect(deleteCourseProgress).toHaveBeenCalledWith('mod-a');
    expect(deleteCourseProgress).toHaveBeenCalledWith('mod-b');
    expect(deleteBadges).toHaveBeenCalledWith('mod-a');
    expect(deleteBadges).toHaveBeenCalledWith('mod-b');
    expect(deleteAllCards).toHaveBeenCalled();
    expect(deleteNotesByCourse).toHaveBeenCalledWith('mod-a');
    expect(deleteNotesByCourse).toHaveBeenCalledWith('mod-b');
  });

  it('succeeds even when some deletions throw', async () => {
    const bundle = makeBundle(['mod-a']);
    vi.mocked(deleteCourseProgress).mockRejectedValueOnce(new Error('DB error'));

    await expect(resetBundle(bundle)).resolves.toBeUndefined();
  });
});
