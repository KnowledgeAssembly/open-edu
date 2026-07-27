import { useState, useCallback } from 'react';
import { listCourses, deleteCourse, type StoredCourse } from '@open-edu/storage';

export interface UseInstalledCoursesResult {
  installedCourses: StoredCourse[];
  loading: boolean;
  refresh: () => Promise<void>;
  removeCourse: (courseId: string) => Promise<void>;
}

export function useInstalledCourses(): UseInstalledCoursesResult {
  const [installedCourses, setInstalledCourses] = useState<StoredCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const courses = await listCourses();
      setInstalledCourses(courses);
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

  return { installedCourses, loading, refresh, removeCourse };
}
