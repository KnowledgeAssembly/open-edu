import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { ThemeSelector } from '../components/ThemeSelector.js';
import type { ThemeId } from '../themes/types.js';

export interface TopAppBarBreadcrumb {
  label: string;
  href?: string;
}

export interface TopAppBarProps {
  breadcrumbs?: TopAppBarBreadcrumb[];
  currentThemeId?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
  showA11yControls?: boolean;
  userAvatar?: string;
  onSearchClick?: () => void;
  onAskAiClick?: () => void;
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

const askAiButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  border: 'none',
  borderRadius: 'var(--oe-radius, 8px)',
  backgroundColor: 'var(--oe-color-primary-container, #eaddff)',
  color: 'var(--oe-color-on-primary-container, #21005d)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
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
  currentThemeId,
  onThemeChange,
  showA11yControls,
  userAvatar,
  onSearchClick,
  onAskAiClick,
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
    <header style={containerStyle} data-testid="top-app-bar" role="banner">
      <div style={leftSectionStyle}>
        {breadcrumbsEnabled && breadcrumbs && breadcrumbs.length > 0 && (
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
              aria-label="Accessibility controls"
              aria-expanded={a11yOpen}
              data-testid="top-appbar-a11y"
            >
              {'\u2672'}
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
                    onChange={(e) => setReadingRulerEnabled(e.target.checked)}
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

        {currentThemeId && onThemeChange && (
          <ThemeSelector currentThemeId={currentThemeId} onThemeChange={onThemeChange} />
        )}

        <button
          type="button"
          style={iconButtonStyle}
          onClick={onSearchClick}
          aria-label="Search"
          data-testid="top-appbar-search"
        >
          {'\uD83D\uDD0D'}
        </button>

        <button
          type="button"
          style={askAiButtonStyle}
          onClick={onAskAiClick}
          data-testid="top-appbar-ask-ai"
        >
          {'\u2728'} Ask AI
        </button>

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
