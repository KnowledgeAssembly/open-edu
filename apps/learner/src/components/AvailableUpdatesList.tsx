import { useState, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { semverGreaterThan, urlSource } from '@open-edu/oep-distribution';
import type { Catalog, InstallResult } from '@open-edu/oep-distribution';
import { getDownloadedCourses, updateFromSource } from '../courseDownload';
import { Button, Badge } from '@open-edu/design-system';

export interface AvailableUpdatesListProps {
  catalog: Catalog | null;
}

export function AvailableUpdatesList({ catalog }: AvailableUpdatesListProps): JSX.Element | null {
  const { t } = useTranslation();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, InstallResult>>({});
  const [updateCount, setUpdateCount] = useState(0);

  useState(() => {
    if (!catalog) {
      setUpdateCount(0);
      return;
    }
    getDownloadedCourses().then((courses) => {
      let count = 0;
      for (const course of courses) {
        const entry = catalog.packages.find((p) => p.id === course.id);
        if (entry && semverGreaterThan(entry.latestVersion, course.version)) {
          count++;
        }
      }
      setUpdateCount(count);
    });
  });

  const handleUpdate = useCallback(
    async (courseId: string, version: string, downloadUrl: string) => {
      setUpdatingId(courseId);
      try {
        const source = urlSource(downloadUrl, `${courseId} v${version}`);
        const result = await updateFromSource(courseId, source);
        setResults((prev) => ({ ...prev, [courseId]: result }));
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [courseId]: {
            success: false,
            courseId,
            version,
            errorCode: 'SOURCE_READ_ERROR',
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        }));
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  if (!catalog || updateCount === 0) return null;

  return (
    <div className="mb-lg p-md bg-surface-container rounded-lg" data-testid="updates-available">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-h3 text-on-surface font-semibold">{t('learner.updates.available')}</h3>
        <Badge variant="default">
          {t('learner.updates.available_count', { count: String(updateCount) })}
        </Badge>
      </div>

      {updateCount > 0 && (
        <div className="space-y-2">
          {catalog.packages.map((entry) => {
            if (results[entry.id]?.success) return null;
            return (
              <div key={entry.id} className="flex items-center justify-between">
                <span className="text-caption text-on-surface">{entry.title}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === entry.id}
                  onClick={() => {
                    const version = entry.versions[entry.versions.length - 1]!;
                    handleUpdate(entry.id, version.version, version.downloadUrl);
                  }}
                >
                  {updatingId === entry.id
                    ? t('learner.updates.updating')
                    : t('learner.updates.update_button', { version: entry.latestVersion })}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
