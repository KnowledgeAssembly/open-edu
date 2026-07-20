import { useState, useEffect, useCallback } from 'react';
import type { StoredCourse } from '@open-edu/storage';
import { useStorageUsage } from '../hooks/useStorageUsage.js';
import { StorageUsageCard } from '../components/StorageUsageCard.js';
import { DownloadedCourseList } from '../components/DownloadedCourseList.js';
import { getDownloadedCourses, deleteDownloadedCourse } from '../courseDownload.js';

export function StorageSettingsPage() {
  const { usage, quota } = useStorageUsage();
  const [courses, setCourses] = useState<StoredCourse[]>([]);

  const loadCourses = useCallback(async () => {
    const downloaded = await getDownloadedCourses();
    setCourses(downloaded);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleDelete = useCallback(
    async (courseId: string) => {
      await deleteDownloadedCourse(courseId);
      await loadCourses();
    },
    [loadCourses],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Storage Settings</h1>
      <StorageUsageCard usage={usage} quota={quota} />
      <DownloadedCourseList courses={courses} onDelete={handleDelete} />
    </div>
  );
}
