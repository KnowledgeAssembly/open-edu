import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { openDatabase, resetDatabase } from '@open-edu/storage';
import { BrowserStudioProvider, useBrowserStudio } from './browserPreview.js';
import type { BrowserCourse } from './browserCourseStore.js';
import { createBrowserCourseStore } from './browserCourseStore.js';

const enc = (s: string) => new TextEncoder().encode(s);

function makeCourse(id: string): BrowserCourse {
  return {
    id,
    version: '1.0.0',
    title: `Course ${id}`,
    files: [
      {
        path: 'package.json',
        data: enc(
          JSON.stringify({
            id,
            title: `Course ${id}`,
            version: '1.0.0',
            author: 'Test',
            entry: 'nodes/lesson.md',
          }),
        ),
      },
      {
        path: 'workflow.json',
        data: enc(JSON.stringify({ routing: { 'nodes/lesson.md': { onComplete: 'COMPLETED' } } })),
      },
      { path: 'nodes/lesson.md', data: enc('# Lesson') },
      { path: 'assets/notes.txt', data: enc('unknown text') },
    ],
    updatedAt: 1,
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserStudioProvider>{children}</BrowserStudioProvider>
);

describe('BrowserStudioProvider', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('studio-courses');
    db.close();
    resetDatabase();
  });

  it('exposes api, store, and session', async () => {
    const { result } = renderHook(() => useBrowserStudio(), { wrapper });
    expect(result.current.api).toBeDefined();
    expect(result.current.store).toBeDefined();
    expect(result.current.session).toBeDefined();
  });

  it('boots the most recently updated course into the preview', async () => {
    const store = createBrowserCourseStore();
    await store.create(makeCourse('latest'));
    await store.create(makeCourse('older'));

    const { result } = renderHook(() => useBrowserStudio(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeCourseId).toBe('latest');
    expect(result.current.loadedPackage).not.toBeNull();
    expect(result.current.loadedPackage!.manifest.id).toBe('latest');
    expect(result.current.loadedPackage!.rootDir).toBe('browser://latest');
    expect(result.current.loadedPackage!.assetPaths).toEqual(['assets/notes.txt']);
  });

  it('openCourse switches the active course and reloads the preview', async () => {
    const store = createBrowserCourseStore();
    await store.create(makeCourse('a'));
    await store.create(makeCourse('b'));

    const { result } = renderHook(() => useBrowserStudio(), { wrapper });
    await waitFor(() => expect(result.current.loadedPackage).not.toBeNull());

    await result.current.openCourse('b');
    await waitFor(() => expect(result.current.activeCourseId).toBe('b'));
    expect(result.current.loadedPackage!.manifest.id).toBe('b');

    await result.current.openCourse('a');
    await waitFor(() => expect(result.current.activeCourseId).toBe('a'));
    expect(result.current.loadedPackage!.manifest.id).toBe('a');
  });

  it('reloadPreview repopulates the package after files change', async () => {
    const store = createBrowserCourseStore();
    await store.create(makeCourse('editable'));
    const { result } = renderHook(() => useBrowserStudio(), { wrapper });
    await waitFor(() => expect(result.current.loadedPackage).not.toBeNull());

    const course = await store.get('editable');
    await store.replace('editable', {
      ...course!,
      files: [
        ...course!.files,
        {
          path: 'nodes/quiz.json',
          data: enc(
            JSON.stringify({
              type: 'quiz',
              question: 'Q?',
              options: [
                { id: 'a', text: 'A', correct: true },
                { id: 'b', text: 'B', correct: false },
              ],
            }),
          ),
        },
      ],
    });
    await result.current.reloadPreview();
    await waitFor(() =>
      expect(result.current.loadedPackage!.nodes.map((n) => n.relativePath)).toContain(
        'nodes/quiz.json',
      ),
    );
  });

  it('clears the preview when reloading with no active course', async () => {
    const store = createBrowserCourseStore();
    await store.create(makeCourse('temp'));
    const { result } = renderHook(() => useBrowserStudio(), { wrapper });
    await waitFor(() => expect(result.current.loadedPackage).not.toBeNull());

    result.current.session.setActiveCourse(null);
    await result.current.reloadPreview();
    await waitFor(() => expect(result.current.loadedPackage).toBeNull());
  });

  it('reports an error and clears the preview when the active course is invalid', async () => {
    const store = createBrowserCourseStore();
    const bad = { ...makeCourse('bad'), files: [{ path: 'package.json', data: enc('not json') }] };
    await store.create(bad);

    const { result } = renderHook(() => useBrowserStudio(), { wrapper });
    await waitFor(() => expect(result.current.loadedPackage).toBeNull());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.loadedPackage).toBeNull();
  });
});
