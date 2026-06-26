import { useState, type CSSProperties } from 'react';

export interface CourseTreeModule {
  title: string;
  lessons: Array<{ id: string; title: string; isActive?: boolean }>;
  isLocked?: boolean;
}

export interface CourseTreeProps {
  modules: CourseTreeModule[];
  onLessonClick?: (lessonId: string) => void;
}

const containerStyle: CSSProperties = {
  fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
  fontSize: '0.875rem',
};

const moduleStyle: CSSProperties = {
  marginBottom: '4px',
};

const moduleHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  cursor: 'pointer',
  borderRadius: 'var(--oe-radius, 8px)',
  border: 'none',
  background: 'none',
  width: '100%',
  textAlign: 'left',
  fontSize: 'inherit',
  fontFamily: 'inherit',
  color: 'var(--oe-color-fg, #1a1a1a)',
  fontWeight: 600,
};

const chevronStyle: CSSProperties = {
  transition: 'transform 200ms ease',
  fontSize: '1.125rem',
  lineHeight: 1,
  flexShrink: 0,
};

const moduleTitleStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const lessonListStyle: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: '4px 0 0 28px',
};

const lessonItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  borderRadius: 'var(--oe-radius, 8px)',
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  width: '100%',
  textAlign: 'left',
  fontSize: 'inherit',
  fontFamily: 'inherit',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
  lineHeight: 1.3,
};

const lessonItemActiveStyle: CSSProperties = {
  ...lessonItemStyle,
  borderLeft: '3px solid var(--oe-color-primary, #6750a4)',
  paddingLeft: '9px',
  color: 'var(--oe-color-primary, #6750a4)',
  fontWeight: 500,
  backgroundColor: 'var(--oe-color-surface-variant, #e7e0ec)',
};

const lockIconStyle: CSSProperties = {
  opacity: 0.4,
  marginLeft: 'auto',
  flexShrink: 0,
};

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
    <nav style={containerStyle} data-testid="course-tree" aria-label="Course modules">
      {modules.map((mod, idx) => {
        const isExpanded = expandedModules.has(idx);
        return (
          <div key={idx} style={moduleStyle} data-testid={`course-tree-module-${idx}`}>
            <button
              type="button"
              style={moduleHeaderStyle}
              onClick={() => toggleModule(idx)}
              aria-expanded={isExpanded}
            >
              <span
                style={{
                  ...chevronStyle,
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                {'\u25B6'}
              </span>
              <span style={moduleTitleStyle}>{mod.title}</span>
              {mod.isLocked && (
                <span style={lockIconStyle} aria-label="Locked">
                  {'\uD83D\uDD12'}
                </span>
              )}
            </button>
            {isExpanded && !mod.isLocked && (
              <ul style={lessonListStyle} data-testid={`course-tree-module-${idx}-lessons`}>
                {mod.lessons.map((lesson) => {
                  const isActive = lesson.isActive ?? false;
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        style={isActive ? lessonItemActiveStyle : lessonItemStyle}
                        onClick={() => onLessonClick?.(lesson.id)}
                        aria-current={isActive ? 'page' : undefined}
                        data-testid={`course-tree-lesson-${lesson.id}`}
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
