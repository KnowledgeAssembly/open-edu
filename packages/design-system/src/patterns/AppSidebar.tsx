import { useState, useCallback, type ReactNode } from 'react';
import { cn } from '../lib/utils.js';
import { Button } from '../primitives/button.js';
import { Badge } from '../primitives/badge.js';

export interface AppSidebarStepItem {
  id: string;
  label: string;
  status: 'current' | 'completed' | 'future';
  onClick?: () => void;
}

export interface AppSidebarSection {
  title: string;
  items: AppSidebarStepItem[];
}

export interface AppSidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface AppSidebarProps {
  title?: string;
  subtitle?: string;
  logo?: ReactNode;
  logoCollapsed?: ReactNode;
  items: AppSidebarItem[];
  currentItemId: string;
  onNavigate: (id: string) => void;
  sections?: AppSidebarSection[];
  onBack?: { label: string; onClick: () => void };
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function AppSidebar({
  title = 'OpenEdu',
  subtitle = 'Interactive learning platform',
  logo,
  logoCollapsed,
  items,
  currentItemId,
  onNavigate,
  sections,
  onBack,
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapseChange,
}: AppSidebarProps): JSX.Element {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggleCollapse = useCallback(() => {
    const next = !collapsed;
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(next);
    }
    onCollapseChange?.(next);
  }, [collapsed, controlledCollapsed, onCollapseChange]);

  const ChevronLeft = (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );

  const BackIcon = (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );

  const CheckIcon = (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );

  return (
    <aside
      className={cn(
        'bg-surface-container border-outline-variant flex h-full flex-col overflow-hidden border-r transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-[var(--oe-space-panelNav,260px)]',
      )}
      data-testid="app-sidebar"
      aria-label="Main navigation"
    >
      <div className="border-outline-variant flex h-16 shrink-0 items-center truncate border-b px-4">
        {!collapsed && logo ? (
          logo
        ) : collapsed && logoCollapsed ? (
          logoCollapsed
        ) : (
          <>
            <h1 className="text-on-surface m-0 text-lg font-bold leading-tight">
              {collapsed ? 'OE' : title}
            </h1>
            {!collapsed && subtitle && (
              <p className="text-on-surface-variant mt-0.5 truncate text-xs leading-tight">
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 p-2" aria-label="App navigation">
        {items.map((item) => {
          const isActive = item.id === currentItemId;
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size={collapsed ? 'icon' : 'sm'}
              className={cn(
                'hover:bg-surface-variant/30 gap-2 transition-colors',
                !isActive && 'hover:text-on-surface text-on-surface-variant',
                collapsed ? 'w-full justify-center' : 'w-full justify-start',
              )}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`appsidebar-nav-${item.id}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {sections && sections.length > 0 && (
        <>
          <hr className="bg-outline-variant mx-4 my-2 h-px border-none" aria-hidden="true" />
          <div className="flex-1 overflow-y-auto px-2 py-1">
            {sections.map((section) => (
              <div key={section.title}>
                {!collapsed && (
                  <div className="px-3 py-1.5">
                    <h2 className="text-on-surface-variant m-0 text-xs font-semibold uppercase tracking-wider">
                      {section.title}
                    </h2>
                  </div>
                )}
                <ol
                  className="m-0 list-none p-0"
                  role="list"
                  aria-label={section.title}
                  data-testid="course-step-list"
                >
                  {section.items.map((step) => {
                    const isCurrent = step.status === 'current';
                    const isCompleted = step.status === 'completed';
                    const isFuture = step.status === 'future';
                    const stateLabel = isCurrent
                      ? ' (current)'
                      : isCompleted
                        ? ' (completed)'
                        : ' (future)';

                    return (
                      <li key={step.id}>
                        <Button
                          variant={isCurrent ? 'secondary' : 'ghost'}
                          size="sm"
                          disabled={isFuture}
                          className={cn(
                            'hover:bg-surface-variant/30 w-full gap-2 text-left transition-colors',
                            !isCurrent && 'hover:text-on-surface text-on-surface-variant',
                            collapsed ? 'justify-center px-0' : 'justify-start px-3',
                          )}
                          onClick={() => step.onClick?.()}
                          aria-current={isCurrent ? 'step' : undefined}
                          aria-label={`${step.label}${stateLabel}`}
                          data-testid={`step-${step.id}`}
                          title={collapsed ? step.label : undefined}
                        >
                          <span className="shrink-0">
                            {isCurrent && (
                              <span className="bg-primary text-on-primary flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                {section.items.indexOf(step) + 1}
                              </span>
                            )}
                            {isCompleted && (
                              <Badge className="flex h-5 w-5 items-center justify-center rounded-full p-0">
                                {CheckIcon}
                              </Badge>
                            )}
                            {isFuture && (
                              <span className="border-outline-variant flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2" />
                            )}
                          </span>
                          {!collapsed && <span className="truncate text-sm">{step.label}</span>}
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}

      {onBack && !collapsed && (
        <div className="border-outline-variant border-t px-2 pb-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1"
            onClick={onBack.onClick}
            data-testid="appsidebar-back"
          >
            {BackIcon}
            {onBack.label}
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="border-outline-variant text-on-surface-variant hover:bg-surface-container-high flex w-full cursor-pointer items-center justify-center border-t bg-transparent py-2 transition-colors"
      >
        <span className={cn('transition-transform duration-200', collapsed && 'rotate-180')}>
          {ChevronLeft}
        </span>
      </button>
    </aside>
  );
}
