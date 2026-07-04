import { useState, type ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export type NavTabId = 'overview' | 'modules' | 'progress' | 'bookmarks' | 'settings';

export interface SideNavProps {
  courseTitle?: string;
  children?: ReactNode;
  onResumeLesson?: () => void;
  activeTab?: NavTabId;
  defaultActiveTab?: NavTabId;
  onTabChange?: (tab: NavTabId) => void;
}

const navTabs: Array<{ id: NavTabId; label: string; icon: string }> = [
  { id: 'overview', label: 'Course Overview', icon: '\uD83C\uDF93' },
  { id: 'modules', label: 'Modules', icon: '\uD83D\uDCDA' },
  { id: 'progress', label: 'My Progress', icon: '\uD83D\uDCC8' },
  { id: 'bookmarks', label: 'Bookmarks', icon: '\uD83D\uDD16' },
  { id: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
];

export function SideNav({
  courseTitle,
  children,
  onResumeLesson,
  activeTab: controlledTab,
  defaultActiveTab,
  onTabChange,
}: SideNavProps): JSX.Element {
  const [internalTab, setInternalTab] = useState<NavTabId>(defaultActiveTab ?? 'overview');
  const activeTab = controlledTab ?? internalTab;
  const handleTabClick = (tab: NavTabId) => {
    if (controlledTab === undefined) {
      setInternalTab(tab);
    }
    onTabChange?.(tab);
  };

  return (
    <aside
      className="bg-surface-container border-outline-variant font-body-md flex h-screen w-[var(--oe-space-panel-nav,260px)] flex-col overflow-hidden border-r"
      data-testid="side-nav"
      aria-label="Course navigation"
    >
      <div className="border-outline-variant border-b px-4 pb-3 pt-5">
        <h1 className="text-fg m-0 text-lg font-bold leading-tight">OpenEdu</h1>
        <p className="text-on-surface-variant m-0 mt-0.5 text-xs leading-tight">
          Interactive learning platform
        </p>
      </div>

      <nav className="flex flex-col gap-0.5 p-2" aria-label="Main navigation">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            data-testid={`sidenav-tab-${tab.id}`}
            className={cn(
              'font-body-md text-on-surface-variant flex cursor-pointer items-center gap-2.5 rounded-l-none rounded-r-md border-l-2 border-none border-transparent bg-transparent px-3 py-2 text-left text-sm transition-[background-color,color,border-color] duration-200',
              activeTab === tab.id &&
                'border-l-primary bg-primary-container text-on-primary-container font-medium',
            )}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center text-base"
              aria-hidden="true"
            >
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>

      <hr className="bg-outline-variant mx-4 my-2 h-px border-none" aria-hidden="true" />

      {courseTitle && (
        <div className="flex-1 overflow-y-auto py-2">
          <h2 className="text-on-surface-variant m-0 px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            {courseTitle}
          </h2>
          {children}
        </div>
      )}

      <div className="border-outline-variant border-t px-4 py-3">
        <button
          type="button"
          onClick={onResumeLesson}
          data-testid="sidenav-resume"
          className="bg-primary text-on-primary font-body-md flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--oe-radius,8px)] border-none px-4 py-2.5 text-sm font-semibold leading-tight"
        >
          {'\u25B6'} Resume Last Lesson
        </button>
      </div>
    </aside>
  );
}
