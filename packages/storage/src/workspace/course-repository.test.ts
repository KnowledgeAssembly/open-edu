import { describe, it, expect } from 'vitest';
import {
  OpfsCourseRepository,
  COURSE_MANIFEST_PATH,
  type CourseInfo,
} from './course-repository.js';
import { WorkspaceConflictError, WorkspaceNotFoundError } from './errors.js';
import { createFakeOpfsRoot, type FakeDirHandle } from '../__tests__/fake-opfs.js';

function makeRepo(): { repo: OpfsCourseRepository; root: FakeDirHandle } {
  const root = createFakeOpfsRoot();
  const repo = new OpfsCourseRepository({ root: root as unknown as FileSystemDirectoryHandle });
  return { repo, root };
}

describe('OpfsCourseRepository', () => {
  it('creates, opens, lists and deletes courses', async () => {
    const { repo } = makeRepo();
    const ws = await repo.create('alpha');
    await ws.writeText('package.json', '{}');
    await ws.writeText('nodes/lesson.md', '# L');
    expect(await repo.exists('alpha')).toBe(true);

    const opened = await repo.open('alpha');
    expect(await opened.readText('package.json')).toBe('{}');
    expect(await opened.readText('nodes/lesson.md')).toBe('# L');

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.courseId).toBe('alpha');
    expect(typeof list[0]!.workspaceId).toBe('string');
    expect(list[0]!.workspaceId.length).toBeGreaterThan(0);

    await repo.delete('alpha');
    expect(await repo.exists('alpha')).toBe(false);
    expect(await repo.list()).toEqual([]);
  });

  it('throws when opening or deleting a missing course', async () => {
    const { repo } = makeRepo();
    await expect(repo.open('missing')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(repo.delete('missing')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('throws when creating a duplicate course', async () => {
    const { repo } = makeRepo();
    await repo.create('dup');
    await expect(repo.create('dup')).rejects.toBeInstanceOf(WorkspaceConflictError);
  });

  it('rejects course ids that are not single safe segments', async () => {
    const { repo } = makeRepo();
    await expect(repo.create('a/b')).rejects.toBeInstanceOf(Error);
    await expect(repo.create('/abs')).rejects.toBeInstanceOf(Error);
    await expect(repo.create('../escape')).rejects.toBeInstanceOf(Error);
  });

  it('derives course identity from the manifest, not the OPFS path', async () => {
    const { repo, root } = makeRepo();
    await repo.create('alpha');
    const courses = await root
      .getDirectoryHandle('openedu')
      .then((d) => d.getDirectoryHandle('courses'));
    const dir = await courses.getDirectoryHandle('alpha');
    courses.rename(dir, 'other');
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.courseId).toBe('alpha');
  });

  it('produces a course manifest that can be read back', async () => {
    const { repo } = makeRepo();
    const ws = await repo.create('manifested');
    const manifest = JSON.parse(await ws.readText(COURSE_MANIFEST_PATH)) as CourseInfo;
    expect(manifest.courseId).toBe('manifested');
    expect(manifest.workspaceId).toBeTruthy();
    expect(typeof manifest.updatedAt).toBe('number');
  });
});
