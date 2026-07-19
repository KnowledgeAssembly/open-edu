import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadCourse, isCourseDownloaded, deleteDownloadedCourse } from '../courseDownload.js';

vi.mock('virtual:edu-data', () => ({
  packageEntries: {
    'hello-world': {
      manifest: { id: 'hello-world', name: 'Hello World', version: '1.0.0' },
      nodes: [],
    },
  },
}));

describe('Course Download', () => {
  beforeEach(async () => {
    const { openDatabase, resetDatabase } = await import('@open-edu/storage');
    const db = await openDatabase();
    await db.clear('courses');
    resetDatabase();
  });

  afterEach(async () => {
    const { openDatabase, resetDatabase } = await import('@open-edu/storage');
    const db = await openDatabase();
    await db.clear('courses');
    resetDatabase();
  });

  it('downloads and stores a course', async () => {
    const result = await downloadCourse('hello-world');
    expect(result.success).toBe(true);

    const downloaded = await isCourseDownloaded('hello-world');
    expect(downloaded).toBe(true);
  });

  it('returns error for non-existent course', async () => {
    const result = await downloadCourse('non-existent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('deletes a downloaded course', async () => {
    await downloadCourse('hello-world');
    await deleteDownloadedCourse('hello-world');
    const downloaded = await isCourseDownloaded('hello-world');
    expect(downloaded).toBe(false);
  });
});
