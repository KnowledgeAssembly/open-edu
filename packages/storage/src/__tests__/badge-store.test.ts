import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase } from '../db.js';
import { saveBadge, getBadges, deleteBadges } from '../badge-store.js';

describe('badge-store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('badges');
  });

  it('deleteBadges removes badges for a specific course', async () => {
    await saveBadge('course-a', ['badge-1', 'badge-2']);
    await saveBadge('course-b', ['badge-3']);

    await deleteBadges('course-a');

    const a = await getBadges('course-a');
    const b = await getBadges('course-b');
    expect(a).toEqual([]);
    expect(b).toEqual(['badge-3']);
  });

  it('deleteBadges is a no-op for a course with no badges', async () => {
    await expect(deleteBadges('nonexistent')).resolves.toBeUndefined();
  });
});
