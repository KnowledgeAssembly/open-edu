import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInstalledCourses } from '../hooks/useInstalledCourses';

const { listCoursesMock, listBundlesMock, deleteCourseMock, deleteBundleMock } = vi.hoisted(() => ({
  listCoursesMock: vi.fn(),
  listBundlesMock: vi.fn(),
  deleteCourseMock: vi.fn(),
  deleteBundleMock: vi.fn(),
}));

vi.mock('@open-edu/storage', () => ({
  listCourses: listCoursesMock,
  listBundles: listBundlesMock,
  deleteCourse: deleteCourseMock,
  deleteBundle: deleteBundleMock,
}));

import type { StoredCourse } from '@open-edu/storage';

const sampleCourses: StoredCourse[] = [
  {
    id: 'course-a',
    version: '1.0.0',
    manifest: { title: 'Course A' },
    nodes: [],
    assets: [],
    downloadedAt: '2026-07-25T00:00:00Z',
  },
  {
    id: 'course-b',
    version: '2.0.0',
    manifest: { title: 'Course B' },
    nodes: [],
    assets: [],
    downloadedAt: '2026-07-26T00:00:00Z',
  },
];

describe('useInstalledCourses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCoursesMock.mockResolvedValue([]);
    listBundlesMock.mockResolvedValue([]);
  });

  it('returns empty list initially', () => {
    const { result } = renderHook(() => useInstalledCourses());
    expect(result.current.installedCourses).toEqual([]);
    expect(result.current.installedBundles).toEqual([]);
  });

  it('loads courses on refresh', async () => {
    listCoursesMock.mockResolvedValue(sampleCourses);
    const { result } = renderHook(() => useInstalledCourses());

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.installedCourses).toEqual(sampleCourses);
    });
    expect(result.current.loading).toBe(false);
  });

  it('loads bundles on refresh', async () => {
    listBundlesMock.mockResolvedValue([{ id: 'bundle-x', version: '1.0.0', bundleManifest: {}, modules: [], downloadedAt: '2026-07-25T00:00:00Z' }]);
    const { result } = renderHook(() => useInstalledCourses());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.installedBundles).toHaveLength(1);
    expect(result.current.installedBundles[0]!.id).toBe('bundle-x');
  });

  it('sets loading to false even when listCourses throws', async () => {
    listCoursesMock.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useInstalledCourses());

    await act(async () => {
      await result.current.refresh().catch(() => {});
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.installedCourses).toEqual([]);
  });

  it('removeCourse deletes and refreshes', async () => {
    listCoursesMock.mockResolvedValueOnce(sampleCourses);
    listCoursesMock.mockResolvedValueOnce([sampleCourses[1]!]);
    const { result } = renderHook(() => useInstalledCourses());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.installedCourses).toEqual(sampleCourses);

    await act(async () => {
      await result.current.removeCourse('course-a');
    });

    expect(deleteCourseMock).toHaveBeenCalledWith('course-a');
    expect(result.current.installedCourses).toEqual([sampleCourses[1]!]);
  });

  it('removeBundle deletes and refreshes', async () => {
    listBundlesMock.mockResolvedValueOnce([{ id: 'bundle-y', version: '1.0.0', bundleManifest: {}, modules: [], downloadedAt: '2026-07-25T00:00:00Z' }]);
    listBundlesMock.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useInstalledCourses());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.installedBundles).toHaveLength(1);

    await act(async () => {
      await result.current.removeBundle('bundle-y');
    });

    expect(deleteBundleMock).toHaveBeenCalledWith('bundle-y');
    expect(result.current.installedBundles).toHaveLength(0);
  });
});
