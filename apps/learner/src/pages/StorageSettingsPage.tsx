import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import type { StoredCourse, StoredBundle } from '@open-edu/storage';
import { useStorageUsage } from '../hooks/useStorageUsage.js';
import { StorageUsageCard } from '../components/StorageUsageCard.js';
import { DownloadedCourseList } from '../components/DownloadedCourseList.js';
import {
  getDownloadedCourses,
  deleteDownloadedCourse,
  getDownloadedBundles,
  deleteDownloadedBundle,
} from '../courseDownload.js';

export function StorageSettingsPage() {
  const { t } = useTranslation();
  const { usage, quota } = useStorageUsage();
  const [courses, setCourses] = useState<StoredCourse[]>([]);
  const [bundles, setBundles] = useState<StoredBundle[]>([]);

  const loadDownloads = useCallback(async () => {
    const [downloaded, downloadedBundles] = await Promise.all([
      getDownloadedCourses(),
      getDownloadedBundles(),
    ]);
    setCourses(downloaded);
    setBundles(downloadedBundles);
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const handleDelete = useCallback(
    async (courseId: string) => {
      await deleteDownloadedCourse(courseId);
      await loadDownloads();
    },
    [loadDownloads],
  );

  const handleDeleteBundle = useCallback(
    async (bundleId: string) => {
      await deleteDownloadedBundle(bundleId);
      await loadDownloads();
    },
    [loadDownloads],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-display">{t('learner.storage.settings')}</h1>
      <StorageUsageCard usage={usage} quota={quota} />
      <DownloadedCourseList
        courses={courses}
        bundles={bundles}
        onDelete={handleDelete}
        onDeleteBundle={handleDeleteBundle}
      />
    </div>
  );
}
