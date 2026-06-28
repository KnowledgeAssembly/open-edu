import { useState } from 'react';
import { cn } from '../lib/utils.js';

export interface CourseTreeModule {
  title: string;
  lessons: Array<{ id: string; title: string; isActive?: boolean }>;
  isLocked?: boolean;
}

export interface CourseTreeProps {
  modules: CourseTreeModule[];
  onLessonClick?: (lessonId: string) => void;
}

export function CourseTree({ modules, onLessonClick }: CourseTreeProps): JSX.Element {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(() => {
    const firstUnlocked = modules.findIndex((m) => !m.isLocked);
    return new Set([firstUnlocked >= 0 ? firstUnlocked : 0]);
  });

  const toggleModule = (idx: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <nav className="font-body-md text-sm" data-testid="course-tree" aria-label="Course modules">
      {modules.map((mod, idx) => {
        const isExpanded = expandedModules.has(idx);
        return (
          <div key={idx} className="mb-1" data-testid={`course-tree-module-${idx}`}>
            <button
              type="button"
              onClick={() => toggleModule(idx)}
              aria-expanded={isExpanded}
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--oe-radius,8px)] border-none bg-transparent w-full text-left text-sm font-body-md font-semibold text-fg cursor-pointer"
            >
              <span
                className="transition-transform duration-200 text-lg leading-none shrink-0"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                {'\u25B6'}
              </span>
              <span className="flex-1 min-w-0">{mod.title}</span>
              {mod.isLocked && (
                <span className="opacity-40 ml-auto shrink-0" aria-label="Locked">
                  {'\uD83D\uDD12'}
                </span>
              )}
            </button>
            {isExpanded && !mod.isLocked && (
              <ul
                className="list-none p-0 m-1 ml-7"
                data-testid={`course-tree-module-${idx}-lessons`}
              >
                {mod.lessons.map((lesson) => {
                  const isActive = lesson.isActive ?? false;
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => onLessonClick?.(lesson.id)}
                        aria-current={isActive ? 'page' : undefined}
                        data-testid={`course-tree-lesson-${lesson.id}`}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-[var(--oe-radius,8px)] cursor-pointer border-none bg-transparent w-full text-left text-sm font-body-md text-on-surface-variant leading-tight',
                          isActive &&
                            'border-l-[3px] border-solid border-[var(--oe-color-primary,#6750a4)] pl-[9px] text-primary font-medium bg-surface-variant',
                        )}
                      >
                        {lesson.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
