import { useState, type ReactNode } from 'react';
import { cn } from '../lib/utils.js';

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

export function SideNav({ courseTitle, children, onResumeLesson }: SideNavProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<NavTabId>('overview');

  return (
    <aside
      className="w-[var(--oe-space-panel-nav,260px)] h-screen flex flex-col bg-surface-container border-r border-outline-variant font-body-md overflow-hidden"
      data-testid="side-nav"
      aria-label="Course navigation"
    >
      <div className="px-4 pb-3 pt-5 border-b border-outline-variant">
        <h1 className="text-lg font-bold m-0 text-fg leading-tight">OpenEdu</h1>
        <p className="text-xs text-on-surface-variant m-0 mt-0.5 leading-tight">
          Interactive learning platform
        </p>
      </div>

      <nav className="p-2 flex flex-col gap-0.5" aria-label="Main navigation">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            data-testid={`sidenav-tab-${tab.id}`}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 border-none border-l-2 border-transparent rounded-r-[var(--oe-radius,8px)] rounded-l-none bg-transparent cursor-pointer text-left text-sm font-body-md text-on-surface-variant transition-[background-color,color] duration-200',
              activeTab === tab.id &&
                'border-l-[var(--oe-color-primary,#6750a4)] bg-primary-container text-on-primary-container font-medium',
            )}
          >
            <span className="shrink-0 text-base w-5 text-center" aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>

      <hr className="h-px bg-outline-variant mx-4 my-2 border-none" aria-hidden="true" />

      {courseTitle && (
        <div className="flex-1 overflow-y-auto py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-4 py-2 m-0">
            {courseTitle}
          </h2>
          {children}
        </div>
      )}

      <div className="px-4 py-3 border-t border-outline-variant">
        <button
          type="button"
          onClick={onResumeLesson}
          data-testid="sidenav-resume"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border-none rounded-[var(--oe-radius,8px)] bg-primary text-on-primary text-sm font-semibold cursor-pointer font-body-md leading-tight"
        >
          {'\u25B6'} Resume Last Lesson
        </button>
      </div>
    </aside>
  );
}
