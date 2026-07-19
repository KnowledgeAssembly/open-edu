import { describe, it, expect, beforeEach } from 'vitest';
import { getAllBadges, getBadges, addBadge } from '../badgesStorage';
import { deleteAllBadges } from '@open-edu/storage';

describe('badgesStorage (IndexedDB)', () => {
  beforeEach(async () => {
    await deleteAllBadges();
  });

  it('returns empty data initially', async () => {
    const all = await getAllBadges();
    expect(all).toEqual({});
  });

  it('saves and retrieves a badge', async () => {
    await addBadge('course-1', 'bronze');
    const badges = await getBadges('course-1');
    expect(badges).toEqual(['bronze']);
  });

  it('does not duplicate badges', async () => {
    await addBadge('course-1', 'bronze');
    await addBadge('course-1', 'bronze');
    const badges = await getBadges('course-1');
    expect(badges).toEqual(['bronze']);
  });

  it('returns empty array for unknown course', async () => {
    const badges = await getBadges('nonexistent');
    expect(badges).toEqual([]);
  });

  it('returns all badges grouped by course', async () => {
    await addBadge('course-1', 'bronze');
    await addBadge('course-1', 'silver');
    await addBadge('course-2', 'gold');
    const all = await getAllBadges();
    expect(all).toEqual({
      'course-1': ['bronze', 'silver'],
      'course-2': ['gold'],
    });
  });

  it('adds multiple distinct badges to the same course', async () => {
    await addBadge('course-1', 'bronze');
    await addBadge('course-1', 'silver');
    await addBadge('course-1', 'gold');
    const badges = await getBadges('course-1');
    expect(badges).toEqual(['bronze', 'silver', 'gold']);
  });
});
