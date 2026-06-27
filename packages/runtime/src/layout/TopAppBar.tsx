import { useState, useRef, useEffect, type CSSProperties } from 'react';

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

const containerStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  width: '100%',
  height: 'var(--oe-space-xl, 64px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  boxSizing: 'border-box',
  backgroundColor: 'var(--oe-color-surface, #fef7ff)',
  borderBottom: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
  fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
  gap: '12px',
};

const leftSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: 1,
  minWidth: 0,
};

const breadcrumbListStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  listStyle: 'none',
  padding: 0,
  margin: 0,
  flexWrap: 'wrap',
};

const breadcrumbItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.875rem',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
};

const breadcrumbLinkStyle: CSSProperties = {
  color: 'var(--oe-color-primary, #6750a4)',
  textDecoration: 'none',
  cursor: 'pointer',
};

const breadcrumbChevronStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
};

const rightSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexShrink: 0,
};

const iconButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  border: 'none',
  borderRadius: 'var(--oe-radius, 8px)',
  background: 'none',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
  cursor: 'pointer',
  fontSize: '1.125rem',
  transition: 'background-color 200ms ease',
};

const courseTitleStyle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  color: 'var(--oe-color-on-surface, #1a1a1a)',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const courseInfoStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  flex: 1,
  minWidth: 0,
};

const miniProgressStyle: CSSProperties = {
  width: '100%',
  maxWidth: '200px',
  height: '4px',
  borderRadius: '2px',
  backgroundColor: 'var(--oe-color-outline-variant, #c4c5d6)',
  overflow: 'hidden',
};

const miniProgressFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: '2px',
  backgroundColor: 'var(--oe-color-primary, #6750a4)',
  transition: 'width 200ms ease',
};

const avatarStyle: CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '2px solid var(--oe-color-outline-variant, #c4c5d6)',
};

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

  return (
    <header style={containerStyle} data-testid="top-app-bar">
      <div style={leftSectionStyle}>
        {isCourseView ? (
          <div style={courseInfoStyle}>
            <span style={courseTitleStyle} title={courseTitle ?? 'Course'}>
              {courseTitle ?? 'Course'}
            </span>
            {progressTotal != null && progressTotal > 0 && (
              <div
                style={miniProgressStyle}
                role="progressbar"
                aria-valuenow={progressCurrent ?? 0}
                aria-valuemin={0}
                aria-valuemax={progressTotal}
                aria-label={`Progress: ${progressCurrent ?? 0} of ${progressTotal}`}
              >
                <div
                  style={{
                    ...miniProgressFillStyle,
                    width: `${Math.round(((progressCurrent ?? 0) / progressTotal) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          breadcrumbsEnabled &&
          breadcrumbs &&
          breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumbs">
              <ol style={breadcrumbListStyle}>
                {breadcrumbs.map((crumb, idx) => (
                  <li key={idx} style={breadcrumbItemStyle}>
                    {idx > 0 && (
                      <span style={breadcrumbChevronStyle} aria-hidden="true">
                        /
                      </span>
                    )}
                    {crumb.href ? (
                      <a href={crumb.href} style={breadcrumbLinkStyle}>
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

      <div style={rightSectionStyle}>
        {showA11yControls && (
          <div style={{ position: 'relative' }}>
            <button
              ref={triggerRef}
              type="button"
              style={iconButtonStyle}
              onClick={() => setA11yOpen((o) => !o)}
              aria-label="Accessibility settings"
              title="Accessibility settings"
              aria-expanded={a11yOpen}
              data-testid="top-appbar-a11y"
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
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 60,
                  width: '200px',
                  padding: '12px',
                  backgroundColor: 'var(--oe-color-surface-container-highest, #e5e2e3)',
                  border: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
                  borderRadius: 'var(--oe-radius-lg, 12px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
                data-testid="top-appbar-a11y-panel"
                role="dialog"
                aria-label="Accessibility controls"
                onKeyDown={handlePanelKeyDown}
              >
                <label
                  style={{
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={breadcrumbsEnabled}
                    onChange={(e) => setBreadcrumbsEnabled(e.target.checked)}
                  />
                  Breadcrumbs
                </label>
                <label
                  style={{
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
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
                <div
                  style={{
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>Font:</span>
                  <button
                    type="button"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      border: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
                      borderRadius: '4px',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFontSize((s) => Math.max(80, s - 10))}
                    aria-label="Decrease font size"
                  >
                    A-
                  </button>
                  <span style={{ fontSize: '0.75rem', minWidth: '2em', textAlign: 'center' }}>
                    {fontSize}%
                  </span>
                  <button
                    type="button"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      border: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
                      borderRadius: '4px',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFontSize((s) => Math.min(150, s + 10))}
                    aria-label="Increase font size"
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
            style={avatarStyle}
            data-testid="top-appbar-avatar"
          />
        ) : (
          <div
            style={{
              ...avatarStyle,
              backgroundColor: 'var(--oe-color-primary-container, #eaddff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--oe-color-on-primary-container, #21005d)',
            }}
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
