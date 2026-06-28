import { useState, useRef, useEffect } from 'react';

export interface TopAppBarBreadcrumb {
  label: string;
  href?: string;
}

export interface TopAppBarProps {
  breadcrumbs?: TopAppBarBreadcrumb[];
  showA11yControls?: boolean;
  userAvatar?: string;
  onReadingRulerChange?: (enabled: boolean) => void;
  isCourseView?: boolean;
  courseTitle?: string;
  progressCurrent?: number;
  progressTotal?: number;
}

export function TopAppBar({
  breadcrumbs,
  showA11yControls,
  userAvatar,
  onReadingRulerChange,
  isCourseView,
  courseTitle,
  progressCurrent,
  progressTotal,
}: TopAppBarProps): JSX.Element {
  const [a11yOpen, setA11yOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [breadcrumbsEnabled, setBreadcrumbsEnabled] = useState(true);
  const [readingRulerEnabled, setReadingRulerEnabled] = useState(false);
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

  useEffect(() => {
    document.documentElement.style.setProperty('--oe-font-size-scale', `${fontSize}%`);
  }, [fontSize]);

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
      className="sticky top-0 z-[50] w-full h-[var(--oe-space-xl,64px)] flex items-center justify-between px-4 box-border bg-surface border-b border-outline-variant font-body-md gap-3"
      data-testid="top-app-bar"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isCourseView ? (
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span
              className="text-lg font-bold text-on-surface leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
              title={courseTitle ?? 'Course'}
            >
              {courseTitle ?? 'Course'}
            </span>
            {progressTotal != null && progressTotal > 0 && (
              <div
                className="w-full max-w-[200px] h-1 rounded-sm bg-outline-variant overflow-hidden"
                role="progressbar"
                aria-valuenow={progressCurrent ?? 0}
                aria-valuemin={0}
                aria-valuemax={progressTotal}
                aria-label={`Progress: ${progressCurrent ?? 0} of ${progressTotal}`}
              >
                <div
                  className="h-full rounded-sm bg-primary transition-[width] duration-200"
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
              <ol className="flex items-center gap-1 list-none p-0 m-0 flex-wrap">
                {breadcrumbs.map((crumb, idx) => (
                  <li key={idx} className="flex items-center gap-1 text-sm text-on-surface-variant">
                    {idx > 0 && (
                      <span className="text-xs text-on-surface-variant" aria-hidden="true">
                        /
                      </span>
                    )}
                    {crumb.href ? (
                      <a href={crumb.href} className="text-primary no-underline cursor-pointer">
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

      <div className="flex items-center gap-2 shrink-0">
        {showA11yControls && (
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setA11yOpen((o) => !o)}
              aria-label="Accessibility settings"
              title="Accessibility settings"
              aria-expanded={a11yOpen}
              data-testid="top-appbar-a11y"
              className="flex items-center justify-center w-9 h-9 border-none rounded-[var(--oe-radius,8px)] bg-transparent text-on-surface-variant cursor-pointer text-lg transition-colors duration-200 hover:bg-surface-container-high"
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6a2 2 0 100-4 2 2 0 000 4z" />
                <path d="M12 8c-3 0-5 1-5 1l1 2s1.5-.5 4-.5v5l-1 5h2l1-4 1 4h2l-1-5v-5c2.5 0 4 .5 4 .5l1-2s-2-1-5-1z" />
              </svg>
            </button>
            {a11yOpen && (
              <div
                ref={panelRef}
                className="absolute top-full right-0 z-[60] w-[200px] p-3 bg-surface-container-highest border border-outline-variant rounded-[var(--oe-radius-lg,12px)] shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex flex-col gap-2"
                data-testid="top-appbar-a11y-panel"
                role="region"
                aria-label="Accessibility controls"
                onKeyDown={handlePanelKeyDown}
              >
                <label className="text-xs flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={breadcrumbsEnabled}
                    onChange={(e) => setBreadcrumbsEnabled(e.target.checked)}
                  />
                  Breadcrumbs
                </label>
                <label className="text-xs flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readingRulerEnabled}
                    onChange={(e) => {
                      setReadingRulerEnabled(e.target.checked);
                      onReadingRulerChange?.(e.target.checked);
                    }}
                  />
                  Reading Ruler
                </label>
                <div className="text-xs flex items-center gap-2">
                  <span>Font:</span>
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.max(80, s - 10))}
                    aria-label="Decrease font size"
                    className="px-2 py-0.5 text-xs border border-outline-variant rounded bg-transparent cursor-pointer"
                  >
                    A-
                  </button>
                  <span className="text-xs min-w-[2em] text-center">{fontSize}%</span>
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.min(150, s + 10))}
                    aria-label="Increase font size"
                    className="px-2 py-0.5 text-xs border border-outline-variant rounded bg-transparent cursor-pointer"
                  >
                    A+
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {userAvatar ? (
          <img
            src={userAvatar}
            alt="User avatar"
            className="w-8 h-8 rounded-full object-cover border-2 border-outline-variant"
            data-testid="top-appbar-avatar"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full object-cover border-2 border-outline-variant bg-primary-container flex items-center justify-center text-sm font-semibold text-on-primary-container"
            aria-label="User avatar placeholder"
            data-testid="top-appbar-avatar"
          >
            {'\uD83D\uDC64'}
          </div>
        )}
      </div>
    </header>
  );
}
