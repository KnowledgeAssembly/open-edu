import { useState, useRef, useEffect } from 'react';
import { useFontSize } from '../font-size-context.js';
import { Button } from '../primitives/button.js';
import { cn } from '../lib/utils.js';

export interface TopAppBarBreadcrumb {
  label: string;
  href?: string;
}

export interface TopAppBarProps {
  breadcrumbs?: TopAppBarBreadcrumb[];
  showA11yControls?: boolean;
  isCourseView?: boolean;
  courseTitle?: string;
  progressCurrent?: number;
  progressTotal?: number;
  actions?: React.ReactNode;
}

export const headerIconButtonClasses = cn(
  'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface relative h-9 w-9 cursor-pointer rounded-[var(--oe-radius,8px)] border-none',
);

export function TopAppBar({
  breadcrumbs,
  showA11yControls,
  isCourseView,
  courseTitle,
  progressCurrent,
  progressTotal,
  actions,
}: TopAppBarProps): JSX.Element {
  const [a11yOpen, setA11yOpen] = useState(false);
  const { fontSize, decreaseFontSize, increaseFontSize } = useFontSize();
  const [breadcrumbsEnabled, setBreadcrumbsEnabled] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!a11yOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setA11yOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    panelRef.current?.querySelector<HTMLElement>('input, button')?.focus();

    return () => document.removeEventListener('keydown', handleEscape);
  }, [a11yOpen]);

  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>('input, button');
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const progressPct =
    progressTotal != null && progressTotal > 0
      ? Math.round(((progressCurrent ?? 0) / progressTotal) * 100)
      : 0;

  return (
    <header
      className="bg-surface border-outline-variant font-body-md sticky top-0 z-[50] box-border flex h-[var(--oe-space-xl,64px)] w-full items-center justify-between gap-3 border-b px-4"
      data-testid="top-app-bar"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isCourseView ? (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className="text-on-surface overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold leading-tight"
              title={courseTitle ?? 'Course'}
            >
              {courseTitle ?? 'Course'}
            </span>
            {progressTotal != null && progressTotal > 0 && (
              <div
                className="bg-outline-variant h-1 w-full max-w-[200px] overflow-hidden rounded-sm"
                role="progressbar"
                aria-valuenow={progressCurrent ?? 0}
                aria-valuemin={0}
                aria-valuemax={progressTotal}
                aria-label={`Progress: ${progressCurrent ?? 0} of ${progressTotal}`}
              >
                <div
                  className="bg-primary h-full rounded-sm transition-[width] duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          breadcrumbsEnabled &&
          breadcrumbs &&
          breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumbs">
              <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
                {breadcrumbs.map((crumb, idx) => (
                  <li key={idx} className="text-on-surface-variant flex items-center gap-1 text-sm">
                    {idx > 0 && (
                      <span className="text-on-surface-variant text-xs" aria-hidden="true">
                        /
                      </span>
                    )}
                    {crumb.href ? (
                      <a href={crumb.href} className="text-primary cursor-pointer no-underline">
                        {crumb.label}
                      </a>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {showA11yControls && (
          <div className="relative">
            <Button
              ref={triggerRef}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setA11yOpen((o) => !o)}
              aria-label="Accessibility settings"
              title="Accessibility settings"
              aria-expanded={a11yOpen}
              data-testid="top-appbar-a11y"
              className={headerIconButtonClasses}
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6a2 2 0 100-4 2 2 0 000 4z" />
                <path d="M12 8c-3 0-5 1-5 1l1 2s1.5-.5 4-.5v5l-1 5h2l1-4 1 4h2l-1-5v-5c2.5 0 4 .5 4 .5l1-2s-2-1-5-1z" />
              </svg>
            </Button>
            {a11yOpen && (
              <div
                ref={panelRef}
                className="bg-surface-container-highest border-outline-variant shadow-elevation-overlay absolute right-0 top-full z-[60] flex w-[200px] flex-col gap-2 rounded-lg border p-3"
                data-testid="top-appbar-a11y-panel"
                role="region"
                aria-label="Accessibility controls"
                onKeyDown={handlePanelKeyDown}
              >
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={breadcrumbsEnabled}
                    onChange={(e) => setBreadcrumbsEnabled(e.target.checked)}
                  />
                  Breadcrumbs
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span>Font:</span>
                  <button
                    type="button"
                    onClick={decreaseFontSize}
                    aria-label="Decrease font size"
                    className="border-outline-variant cursor-pointer rounded border bg-transparent px-2 py-0.5 text-xs"
                  >
                    A-
                  </button>
                  <span className="min-w-[2em] text-center text-xs">{fontSize}%</span>
                  <button
                    type="button"
                    onClick={increaseFontSize}
                    aria-label="Increase font size"
                    className="border-outline-variant cursor-pointer rounded border bg-transparent px-2 py-0.5 text-xs"
                  >
                    A+
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
