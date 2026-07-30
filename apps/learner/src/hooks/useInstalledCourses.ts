import { useState, useCallback } from 'react';
import {
  listCourses,
  deleteCourse,
  listBundles,
  deleteBundle,
  type StoredCourse,
  type StoredBundle,
} from '@open-edu/storage';

export interface UseInstalledCoursesResult {
  installedCourses: StoredCourse[];
  installedBundles: StoredBundle[];
  loading: boolean;
  refresh: () => Promise<void>;
  removeCourse: (courseId: string) => Promise<void>;
  removeBundle: (bundleId: string) => Promise<void>;
}

export function useInstalledCourses(): UseInstalledCoursesResult {
  const [installedCourses, setInstalledCourses] = useState<StoredCourse[]>([]);
  const [installedBundles, setInstalledBundles] = useState<StoredBundle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [courses, bundles] = await Promise.all([listCourses(), listBundles()]);
      setInstalledCourses(courses);
      setInstalledBundles(bundles);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeCourse = useCallback(
    async (courseId: string) => {
      await deleteCourse(courseId);
      await refresh();
    },
    [refresh],
  );

  const removeBundle = useCallback(
    async (bundleId: string) => {
      await deleteBundle(bundleId);
      await refresh();
    },
    [refresh],
  );

  return { installedCourses, installedBundles, loading, refresh, removeCourse, removeBundle };
}
