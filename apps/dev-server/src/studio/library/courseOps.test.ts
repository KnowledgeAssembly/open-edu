import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  duplicateCourse,
  renameCourse,
  archiveCourse,
  importCourseFolder,
} from './courseOps';

let ws = '';

function courseManifest(id: string, title: string) {
  return JSON.stringify(
    { id, title, version: '1.0.0', author: 'Test', entry: 'nodes/intro.md' },
    null,
    2,
  );
}

async function makeCourse(name: string, id: string, title: string): Promise<string> {
  const dir = join(ws, name);
  await mkdir(join(dir, 'nodes'), { recursive: true });
  await writeFile(join(dir, 'package.json'), courseManifest(id, title), 'utf-8');
  await writeFile(join(dir, 'nodes/intro.md'), `# ${title}\n`, 'utf-8');
  return dir;
}

async function manifestOf(dir: string): Promise<{ id: string; title: string }> {
  const raw = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'));
  return { id: raw.id, title: raw.title };
}

beforeEach(async () => {
  ws = await mkdtemp(join(tmpdir(), 'openedu-studio-ops-'));
});

afterEach(async () => {
  await rm(ws, { recursive: true, force: true });
});

describe('duplicateCourse', () => {
  it('copies the tree with a new id/title and leaves the source untouched', async () => {
    const src = await makeCourse('fractions', 'fractions', 'Fractions');
    const result = await duplicateCourse(src, ws, 'fractions-copy', 'Fractions Copy');

    const copiedDir = join(ws, result.relativePath);
    const original = await manifestOf(src);
    const copy = await manifestOf(copiedDir);
    expect(copy).toEqual({ id: 'fractions-copy', title: 'Fractions Copy' });
    expect(original).toEqual({ id: 'fractions', title: 'Fractions' });
    expect((await readdir(join(copiedDir, 'nodes'))).includes('intro.md')).toBe(true);
  });

  it('avoids colliding with an existing destination directory', async () => {
    const src = await makeCourse('fractions', 'fractions', 'Fractions');
    await duplicateCourse(src, ws, 'fractions-copy', 'Fractions Copy');
    const second = await duplicateCourse(src, ws, 'fractions-copy', 'Fractions Copy 2');
    expect(second.relativePath).not.toBe('fractions-copy');
  });
});

describe('renameCourse', () => {
  it('updates the manifest title', async () => {
    const dir = await makeCourse('fractions', 'fractions', 'Fractions');
    const result = await renameCourse(dir, ws, 'Fractions Remastered');
    expect(result.title).toBe('Fractions Remastered');
    expect((await manifestOf(dir)).title).toBe('Fractions Remastered');
  });

  it('rejects when the new title would invalidate the manifest', async () => {
    const dir = await makeCourse('fractions', 'fractions', 'Fractions');
    await expect(renameCourse(dir, ws, '')).rejects.toThrow(/invalid/);
  });
});

describe('archiveCourse', () => {
  it('moves the folder under .archive with a timestamped name', async () => {
    const dir = await makeCourse('fractions', 'fractions', 'Fractions');
    const target = await archiveCourse(dir, ws);
    expect(target).toContain(join(ws, '.archive'));
    expect(target).toContain('fractions-');
    expect(await stat(target)).toBeTruthy();
    expect(await readdir(ws)).not.toContain('fractions');
  });
});

describe('importCourseFolder', () => {
  it('imports a valid OpenEdu package from outside the workspace', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'openedu-studio-import-'));
    try {
      await makeCourseAt(outside, 'intro-javascript', 'Intro to JavaScript');
      const result = await importCourseFolder(outside, ws);
      expect(result.id).toBe('intro-javascript');
      expect((await manifestOf(join(ws, result.relativePath))).id).toBe('intro-javascript');
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it('rejects a folder without a valid OpenEdu manifest', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'openedu-studio-import-'));
    try {
      await writeFile(
        join(outside, 'package.json'),
        JSON.stringify({ name: 'plain-package', version: '1.0.0' }),
        'utf-8',
      );
      await expect(importCourseFolder(outside, ws)).rejects.toThrow(/not a valid OpenEdu package/);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

async function makeCourseAt(base: string, id: string, title: string) {
  await mkdir(join(base, 'nodes'), { recursive: true });
  await writeFile(join(base, 'package.json'), courseManifest(id, title), 'utf-8');
  await writeFile(join(base, 'nodes/intro.md'), `# ${title}\n`, 'utf-8');
}
