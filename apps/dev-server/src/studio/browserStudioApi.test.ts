import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDatabase, resetDatabase } from '@open-edu/storage';
import { createBrowserStudioApi, createBrowserStudioSession } from './browserStudioApi.js';
import {
  createBrowserCourseStore,
  buildFileIndex,
  type BrowserCourse,
} from './browserCourseStore.js';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const FIXTURE_DIR = resolve(__dirname, '../../../../packages/core/src/__fixtures__/browser-studio');

const enc = (s: string) => new TextEncoder().encode(s);

function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

async function fixtureBytes(): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  async function walk(rel: string): Promise<void> {
    const full = join(FIXTURE_DIR, rel);
    const s = await stat(full);
    if (s.isDirectory()) {
      for (const entry of await readdir(full)) {
        await walk(rel ? `${rel}/${entry}` : entry);
      }
    } else {
      files.set(rel, new Uint8Array(await readFile(full)));
    }
  }
  await walk('');
  return files;
}

async function fixtureOepBytes(): Promise<Uint8Array> {
  const files = await fixtureBytes();
  const api = createBrowserApi();
  const session = api.session;
  const course: BrowserCourse = {
    id: 'browser-studio',
    version: '1.0.0',
    title: 'Browser Studio Composite',
    files: Array.from(files.entries()).map(([path, data]) => ({ path, data })),
    updatedAt: Date.now(),
  };
  await api.store.create(course);
  session.setActiveCourse('browser-studio');
  const { blob } = await api.api.exportOep();
  return new Uint8Array(await blobToBytes(blob));
}

function createBrowserApi() {
  const store = createBrowserCourseStore();
  const session = createBrowserStudioSession();
  const api = createBrowserStudioApi({ store, session });
  return { store, session, api };
}

describe('BrowserStudioApi', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('studio-courses');
    db.close();
    resetDatabase();
  });

  it('creates a template course from the shared catalog', async () => {
    const { store, session, api } = createBrowserApi();
    await api.applyTemplate('lesson-quiz');
    expect(session.activeCourseId).toBe('lesson-quiz');
    const course = await store.get('lesson-quiz');
    expect(course).not.toBeNull();
    const index = buildFileIndex(course!.files);
    expect(index.has('package.json')).toBe(true);
    expect(index.has('nodes/lesson.md')).toBe(true);
    expect(index.has('nodes/quiz.json')).toBe(true);
    expect(course!.title).toBe('Lesson and Quiz');
    const pkg = JSON.parse(new TextDecoder().decode(index.get('package.json')!)) as {
      id?: string;
    };
    expect(pkg.id).toBe('lesson-quiz');
  });

  it('lists and opens library courses by browser id', async () => {
    const { session, api } = createBrowserApi();
    await api.applyTemplate('reading-lesson');
    await api.openLibraryCourse('reading-lesson');

    const library = await api.getLibrary();
    expect(library.workspace).toBe('browser');
    expect(library.entries.map((e) => e.id)).toContain('reading-lesson');
    expect(library.entries[0]!.relativePath).toBe('reading-lesson');
    expect(library.entries[0]!.kind).toBe('course');

    const opened = await api.openLibraryCourse('reading-lesson');
    expect(opened.success).toBe(true);
    expect(opened.packageDir).toBe('browser://reading-lesson');
    expect(session.activeCourseId).toBe('reading-lesson');
  });

  it('reports the stable browser package directory identifier', async () => {
    const { api } = createBrowserApi();
    expect(await api.getPackageDir()).toBe('browser://no-course');
  });

  it('reads, writes, and deletes files', async () => {
    const { store, session, api } = createBrowserApi();
    await api.applyTemplate('reading-lesson');
    await api.openLibraryCourse('reading-lesson');

    const original = await api.readFile('nodes/lesson.md');
    expect(original.content).toContain('# Reading Lesson');

    await api.writeFile('nodes/lesson.md', '# Updated Lesson\n\nNew content.');
    const updated = await api.readFile('nodes/lesson.md');
    expect(updated.content).toContain('# Updated Lesson');

    await api.writeFile('notes.txt', 'A new unknown file');
    const afterWrite = buildFileIndex((await store.get('reading-lesson'))!.files);
    expect(new TextDecoder().decode(afterWrite.get('notes.txt'))).toBe('A new unknown file');

    const del = await api.deleteFile('notes.txt');
    expect(del.success).toBe(true);
    const afterDelete = buildFileIndex((await store.get('reading-lesson'))!.files);
    expect(afterDelete.has('notes.txt')).toBe(false);
    expect(session.activeCourseId).toBe('reading-lesson');
  });

  it('rejects reading binary files as text', async () => {
    const { store, session, api } = createBrowserApi();
    await api.applyTemplate('reading-lesson');
    await api.openLibraryCourse('reading-lesson');
    const course = (await store.get('reading-lesson'))!;
    await api.writeFile('assets/pic.png', 'placeholder');
    // Replace the stored bytes with real binary data.
    const png = new Uint8Array([137, 80, 78, 71, 0, 1, 2]);
    await store.replace('reading-lesson', {
      ...course,
      files: [...course.files, { path: 'assets/pic.png', data: png }],
    });
    session.setActiveCourse('reading-lesson');
    await expect(api.readFile('assets/pic.png')).rejects.toMatchObject({ code: 'binary-file' });
  });

  it('validates packages through the shared loader', async () => {
    const { store, session, api } = createBrowserApi();
    await api.applyTemplate('lesson-quiz');
    await api.openLibraryCourse('lesson-quiz');
    expect(await api.validate()).toEqual({ valid: true, errors: [] });

    // Break the manifest: entry node missing.
    const course = (await store.get('lesson-quiz'))!;
    const index = buildFileIndex(course.files);
    const manifest = JSON.parse(new TextDecoder().decode(index.get('package.json')!)) as {
      entry?: string;
    };
    manifest.entry = 'nodes/missing.md';
    await store.replace('lesson-quiz', {
      ...course,
      files: course.files.map((f) =>
        f.path === 'package.json'
          ? { path: f.path, data: enc(JSON.stringify(manifest, null, 2)) }
          : f,
      ),
    });
    session.setActiveCourse('lesson-quiz');

    const result = await api.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]!.path).toBe('nodes/missing.md');
  });

  it('derives the outline from workflow routing order', async () => {
    const { api } = createBrowserApi();
    await api.applyTemplate('lesson-quiz');
    await api.openLibraryCourse('lesson-quiz');

    const outline = await api.getOutline();
    expect(outline.title).toBe('Lesson and Quiz');
    expect(outline.activities.map((a) => a.path)).toEqual(['nodes/lesson.md', 'nodes/quiz.json']);
    expect(outline.activities[1]!.kind).toBe('quiz');
  });

  it('persists outline reorder into manifest and workflow', async () => {
    const { store, session, api } = createBrowserApi();
    await api.applyTemplate('lesson-quiz');
    await api.openLibraryCourse('lesson-quiz');

    await api.saveOutlineOrder(['nodes/quiz.json', 'nodes/lesson.md']);
    const course = (await store.get('lesson-quiz'))!;
    const index = buildFileIndex(course.files);
    const workflow = JSON.parse(new TextDecoder().decode(index.get('workflow.json')!)) as {
      routing?: Record<string, unknown>;
    };
    expect(Object.keys(workflow.routing ?? {})).toEqual(['nodes/quiz.json', 'nodes/lesson.md']);
    const manifest = JSON.parse(new TextDecoder().decode(index.get('package.json')!)) as {
      entry?: string;
    };
    expect(manifest.entry).toBe('nodes/quiz.json');
    expect(session.activeCourseId).toBe('lesson-quiz');
  });

  it('duplicates and renames courses', async () => {
    const { api } = createBrowserApi();
    await api.applyTemplate('reading-lesson');
    const dup = await api.duplicateCourse('reading-lesson', 'reading-copy', 'Reading Copy');
    expect(dup.success).toBe(true);
    const loaded = await api.openLibraryCourse('reading-copy');
    expect(loaded.packageDir).toBe('browser://reading-copy');

    const renamed = await api.renameCourse('reading-copy', 'Reading Copy v2');
    expect(renamed.entry.title).toBe('Reading Copy v2');
    const renamedCourse = await (await import('./browserCourseStore.js')).createBrowserCourseStore()
      .get;
    void renamedCourse;
  });

  it('archives (hard-deletes) without a fabricated archivedPath', async () => {
    const { store, api } = createBrowserApi();
    await api.applyTemplate('reading-lesson');
    const result = await api.archiveCourse('reading-lesson');
    expect(result.success).toBe(true);
    expect(result.archivedPath).toBeUndefined();
    expect(await store.get('reading-lesson')).toBeNull();
    await expect(api.openLibraryCourse('reading-lesson')).rejects.toMatchObject({
      code: 'course-not-found',
    });
  });

  it('round-trips .oep export and import with unknown and binary files intact', async () => {
    const api1 = createBrowserApi();
    const files = await fixtureBytes();
    const course: BrowserCourse = {
      id: 'browser-studio',
      version: '1.0.0',
      title: 'Browser Studio Composite',
      files: Array.from(files.entries()).map(([path, data]) => ({ path, data })),
      updatedAt: Date.now(),
    };
    await api1.store.create(course);
    api1.session.setActiveCourse('browser-studio');

    const { blob, fileName } = await api1.api.exportOep();
    expect(fileName).toBe('browser-studio-1.0.0.oep');
    const bytes = new Uint8Array(await blobToBytes(blob));

    const api2 = createBrowserApi();
    const summary = await api2.api.importOep(bytes);
    expect(summary.id).toBe('browser-studio');
    expect(summary.title).toBe('Browser Studio Composite');

    const imported = await api2.store.get('browser-studio');
    expect(imported).not.toBeNull();
    const index = buildFileIndex(imported!.files);
    expect(index.has('package.json')).toBe(true);
    expect(index.has('workflow.json')).toBe(true);
    expect(index.has('rewards.json')).toBe(true);
    expect(index.has('cards.json')).toBe(true);
    expect(index.has('nodes/lesson.md')).toBe(true);
    expect(index.has('nodes/quiz.json')).toBe(true);
    expect(index.has('assets/notes.txt')).toBe(true);
    const png = await fixtureBytes();
    expect(index.get('assets/diagram.png')).toEqual(png.get('assets/diagram.png'));
    expect(new TextDecoder().decode(index.get('assets/notes.txt')!)).toContain('Unknown text file');
    expect(api2.session.activeCourseId).toBe('browser-studio');
  });

  it('imports .oep into a new course without clobbering an existing one', async () => {
    const bytes = await fixtureOepBytes();
    const api = createBrowserApi();
    await api.api.applyTemplate('reading-lesson');
    const summary = await api.api.importOep(bytes);
    expect(summary.id).toBe('browser-studio');
    expect(await api.store.get('reading-lesson')).not.toBeNull();
    expect(api.session.activeCourseId).toBe('browser-studio');
  });

  it('returns unsupported errors for unit/folder operations', async () => {
    const { api } = createBrowserApi();
    for (const operation of [
      () => api.importCourseFolder('/tmp/x'),
      () => api.createUnit('U', ['a', 'b']),
      () => api.exportUnitOep('units/u'),
    ]) {
      await expect(operation()).rejects.toMatchObject({ code: 'unsupported-in-browser' });
    }
  });

  it('reports AI as unavailable in Phase 1 browser mode', async () => {
    const { api } = createBrowserApi();
    expect(await api.getAiStatus()).toEqual({ available: false, reason: 'disabled' });
    await expect(api.generateItemAdd('lesson', 'x')).rejects.toMatchObject({
      code: 'unsupported-in-browser',
    });
  });

  it('reports storage status', async () => {
    const { api } = createBrowserApi();
    const status = await api.getStorageStatus();
    expect(status.available).toBe(true);
  });

  it('returns a preview package for the active course', async () => {
    const { api } = createBrowserApi();
    await api.applyTemplate('lesson-quiz');
    const pkg = await api.getPreviewPackage();
    expect(pkg).not.toBeNull();
    expect(pkg!.rootDir).toBe('browser://lesson-quiz');
    expect(pkg!.manifest.id).toBe('lesson-quiz');
    expect(pkg!.assetPaths).toEqual([]);
  });
});
