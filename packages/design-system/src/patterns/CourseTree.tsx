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
              className="font-body-md text-fg flex w-full cursor-pointer items-center gap-2 rounded-[var(--oe-radius,8px)] border-none bg-transparent px-3 py-2 text-left text-sm font-semibold"
            >
              <span
                className="shrink-0 text-lg leading-none transition-transform duration-200"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                {'\u25B6'}
              </span>
              <span className="min-w-0 flex-1">{mod.title}</span>
              {mod.isLocked && (
                <span className="ml-auto shrink-0 opacity-40" aria-label="Locked">
                  {'\uD83D\uDD12'}
                </span>
              )}
            </button>
            {isExpanded && !mod.isLocked && (
              <ul
                className="m-1 ml-7 list-none p-0"
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
                          'font-body-md text-on-surface-variant flex w-full cursor-pointer items-center gap-2 rounded-[var(--oe-radius,8px)] border-none bg-transparent px-3 py-1.5 text-left text-sm leading-tight',
                          isActive &&
                            'text-primary bg-surface-variant border-l-[3px] border-solid border-[var(--oe-color-primary)] pl-[9px] font-medium',
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
