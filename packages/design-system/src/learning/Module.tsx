import { useState } from 'react';
import { cn } from '../lib/utils.js';
import { Card } from '../primitives/card.js';

export interface ModuleLesson {
  id: string;
  title: string;
  isActive?: boolean;
}

export interface ModuleProps {
  title: string;
  lessons: ModuleLesson[];
  totalLessons?: number;
  completedLessons?: number;
  onLessonClick?: (lessonId: string) => void;
  className?: string;
}

export function Module({
  title,
  lessons,
  totalLessons = lessons.length,
  completedLessons = 0,
  onLessonClick,
  className,
}: ModuleProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card data-testid="module" className={cn('w-full overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className={cn(
          'flex w-full items-center gap-3 border-none bg-surface px-5 py-4 text-left cursor-pointer',
          'transition-colors duration-200 hover:bg-surface-container-high',
        )}
      >
        <span
          className="text-sm leading-none text-on-surface-variant transition-transform duration-200 shrink-0"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          {'\u25B6'}
        </span>
        <span className="flex-1 text-base font-semibold text-on-surface">{title}</span>
        <span className="text-xs text-on-surface-variant whitespace-nowrap">
          {completedLessons} of {totalLessons} lessons
        </span>
      </button>

      {isExpanded && (
        <ul className="m-0 list-none p-0 pb-3">
          {lessons.map((lesson) => {
            const isActive = lesson.isActive ?? false;
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => onLessonClick?.(lesson.id)}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`module-lesson-${lesson.id}`}
                  className={cn(
                    'flex w-full items-center gap-3 border-none bg-transparent px-5 py-2.5 text-left cursor-pointer',
                    'text-sm text-on-surface-variant font-body-md transition-colors duration-200 hover:bg-surface-container-higher',
                    isActive &&
                      'border-l-[3px] border-solid border-[var(--oe-color-primary,#6750a4)] bg-surface-variant pl-[17px] font-medium text-primary',
                  )}
                >
                  {lesson.title}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
