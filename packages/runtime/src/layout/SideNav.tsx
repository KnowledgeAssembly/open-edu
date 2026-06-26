import { useState, type CSSProperties, type ReactNode } from 'react';

export interface SideNavProps {
  courseTitle?: string;
  children?: ReactNode;
  onResumeLesson?: () => void;
}

type NavTabId = 'overview' | 'modules' | 'progress' | 'bookmarks' | 'settings';

const navTabs: Array<{ id: NavTabId; label: string; icon: string }> = [
  { id: 'overview', label: 'Course Overview', icon: '\uD83C\uDF93' },
  { id: 'modules', label: 'Modules', icon: '\uD83D\uDCDA' },
  { id: 'progress', label: 'My Progress', icon: '\uD83D\uDCC8' },
  { id: 'bookmarks', label: 'Bookmarks', icon: '\uD83D\uDD16' },
  { id: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
];

const containerStyle: CSSProperties = {
  width: 'var(--oe-space-panel-nav, 260px)',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--oe-color-surface-container, #f0edee)',
  borderRight: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
  fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  padding: '20px 16px 12px',
  borderBottom: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
};

const logoStyle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  margin: 0,
  color: 'var(--oe-color-fg, #1a1a1a)',
  lineHeight: 1.3,
};

const taglineStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
  margin: '2px 0 0',
  lineHeight: 1.3,
};

const navTabsStyle: CSSProperties = {
  padding: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const tabBaseStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  border: 'none',
  borderLeft: '2px solid transparent',
  borderRadius: '0 var(--oe-radius, 8px) var(--oe-radius, 8px) 0',
  background: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
  lineHeight: 1.3,
  transition: 'background-color 200ms ease, color 200ms ease',
};

const tabActiveStyle: CSSProperties = {
  ...tabBaseStyle,
  borderLeft: '2px solid var(--oe-color-primary, #6750a4)',
  backgroundColor: 'var(--oe-color-primary-container, #eaddff)',
  color: 'var(--oe-color-on-primary-container, #21005d)',
  fontWeight: 500,
};

const tabIconStyle: CSSProperties = {
  flexShrink: 0,
  fontSize: '1rem',
  width: '20px',
  textAlign: 'center',
};

const dividerStyle: CSSProperties = {
  height: '1px',
  backgroundColor: 'var(--oe-color-outline-variant, #c4c5d6)',
  margin: '8px 16px',
  border: 'none',
};

const courseSectionStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 0',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--oe-color-on-surface-variant, #49454f)',
  padding: '8px 16px',
  margin: 0,
};

const footerStyle: CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
};

const resumeButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '10px 16px',
  border: 'none',
  borderRadius: 'var(--oe-radius, 8px)',
  backgroundColor: 'var(--oe-color-primary, #6750a4)',
  color: 'var(--oe-color-on-primary, #ffffff)',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 1.3,
};

export function SideNav({ courseTitle, children, onResumeLesson }: SideNavProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<NavTabId>('overview');

  return (
    <aside style={containerStyle} data-testid="side-nav" aria-label="Course navigation">
      <div style={headerStyle}>
        <h1 style={logoStyle}>OpenEdu</h1>
        <p style={taglineStyle}>Interactive learning platform</p>
      </div>

      <nav style={navTabsStyle} aria-label="Main navigation">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={activeTab === tab.id ? tabActiveStyle : tabBaseStyle}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            data-testid={`sidenav-tab-${tab.id}`}
          >
            <span style={tabIconStyle} aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>

      <hr style={dividerStyle} aria-hidden="true" />

      {courseTitle && (
        <div style={courseSectionStyle}>
          <h2 style={sectionTitleStyle}>{courseTitle}</h2>
          {children}
        </div>
      )}

      <div style={footerStyle}>
        <button
          type="button"
          style={resumeButtonStyle}
          onClick={onResumeLesson}
          data-testid="sidenav-resume"
        >
          {'\u25B6'} Resume Last Lesson
        </button>
      </div>
    </aside>
  );
}
