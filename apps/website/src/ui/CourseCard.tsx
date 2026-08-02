import { useTranslation } from '@open-edu/i18n';
import { Badge, Card, CardContent } from '@open-edu/design-system';
import { BookOpen, Users } from 'lucide-react';
import type { CourseMeta } from '../data/courses';

interface CourseCardProps {
  course: CourseMeta;
}

export function CourseCard({ course }: CourseCardProps): JSX.Element {
  const { t } = useTranslation();
  const Icon = course.icon;
  const titleId = `course-title-${course.id}`;

  return (
    <Card
      aria-labelledby={titleId}
      className="h-full transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <CardContent className="p-6">
        <div
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${course.accent}`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <Badge variant="secondary" className="mt-4">
          {t(`website.courses.filter_${course.category}`)}
        </Badge>
        <h3
          id={titleId}
          className="text-on-surface mt-3 text-lg font-semibold leading-tight tracking-tight"
        >
          {t(course.titleKey)}
        </h3>
        <p className="text-on-surface-variant mt-2 text-sm">{t(course.descriptionKey)}</p>
        <div className="text-on-surface-variant mt-4 flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {t('website.courses.lessons', { count: String(course.lessonCount) })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('website.courses.age_range', { range: course.ageRange })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

CourseCard.displayName = 'CourseCard';
