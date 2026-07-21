import * as React from 'react';
import { Trash2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { Button } from './ui/button.js';
import { useTranslation } from '@open-edu/i18n';
import type { StoredCourse } from '@open-edu/storage';

interface DownloadedCourseListProps {
  courses: StoredCourse[];
  onDelete?: (courseId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export const DownloadedCourseList = React.forwardRef<HTMLDivElement, DownloadedCourseListProps>(
  ({ courses, onDelete }, ref) => {
    const { t } = useTranslation();
    if (courses.length === 0) {
      return (
        <Card ref={ref}>
          <CardContent className="text-on-surface/60 py-8 text-center">
            <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
            <p className="text-body-ui">{t('learner.downloads.no_courses')}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          <CardTitle className="text-body-ui">
            {t('learner.downloads.title', { count: String(courses.length) })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul
            className="divide-border divide-y"
            role="list"
            aria-label={t('learner.downloads.list_aria')}
          >
            {courses.map((course) => (
              <li key={course.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-body-ui font-medium">
                    {((course.manifest as Record<string, unknown>).title as string) ?? course.id}
                  </p>
                  <p className="text-on-surface/60 text-caption">
                    v{course.version} · Downloaded {formatDate(course.downloadedAt)}
                  </p>
                </div>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(course.id)}
                    aria-label={`Remove ${((course.manifest as Record<string, unknown>).title as string) ?? course.id}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  },
);
DownloadedCourseList.displayName = 'DownloadedCourseList';
