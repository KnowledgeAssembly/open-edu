import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { Button } from '@open-edu/design-system';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COURSES, COURSE_CATEGORIES, type CourseCategory } from '../../data/courses';
import { CourseCard } from '../../ui/CourseCard';

type ActiveCategory = 'all' | CourseCategory;

const SCROLL_STEP = 320;

export function ExploreCourses(): JSX.Element {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>('all');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const visible =
    activeCategory === 'all'
      ? COURSES
      : COURSES.filter((course) => course.category === activeCategory);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ left: 0, behavior: 'smooth' });
  }, [activeCategory]);

  const scrollBy = (amount: number): void => {
    scrollRef.current?.scrollBy?.({ left: amount, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="courses-heading" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold uppercase tracking-wide">
            {t('website.courses.eyebrow')}
          </p>
          <h2
            id="courses-heading"
            className="text-on-surface mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('website.courses.title')}
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg">{t('website.courses.subtitle')}</p>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t('website.courses.title')}
          >
            {COURSE_CATEGORIES.map((category) => {
              const active = category.id === activeCategory;
              return (
                <Button
                  key={category.id}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={active}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {t(category.labelKey)}
                </Button>
              );
            })}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t('website.courses.scroll_prev')}
              onClick={() => scrollBy(-SCROLL_STEP)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t('website.courses.scroll_next')}
              onClick={() => scrollBy(SCROLL_STEP)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex snap-x gap-6 overflow-x-auto pb-4">
          {visible.map((course) => (
            <div key={course.id} className="w-80 shrink-0 snap-start">
              <CourseCard course={course} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

ExploreCourses.displayName = 'ExploreCourses';
