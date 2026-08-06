import { useState, useCallback, useEffect, type ReactNode } from 'react';
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

/**
 * Detects desktop "fine pointer + hover" capabilities via the CSS media query
 * `(hover: hover) and (pointer: fine)`. Used to gate temporary hover flyout
 * of a pinned-collapsed sidebar so touch / coarse-pointer devices keep the
 * toggle-only behavior.
 *
 * The initial value is read synchronously (lazy initial state) so the sidebar
 * is hover-ready on the very first render instead of waiting for a mount
 * effect; the effect keeps the value in sync with live media-query changes.
 */
function useFinePointer(): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return matches;
}

interface SidebarPanelProps {
  showExpandedContent: boolean;
  title: string;
  subtitle?: string;
  logo?: ReactNode;
  logoCollapsed?: ReactNode;
  items: AppSidebarItem[];
  currentItemId: string;
  onNavigate: (id: string) => void;
  sections?: AppSidebarSection[];
  onBack?: { label: string; onClick: () => void };
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** When true, interactive nav items are hidden from assistive tech (flyout is active). */
  inertNav?: boolean;
}

function SidebarPanel({
  showExpandedContent,
  title,
  subtitle,
  logo,
  logoCollapsed,
  items,
  currentItemId,
  onNavigate,
  sections,
  onBack,
  collapsed,
  onToggleCollapse,
  inertNav = false,
}: SidebarPanelProps): JSX.Element {
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
    <>
      <div className="border-outline-variant flex h-16 shrink-0 items-center truncate border-b px-4">
        {showExpandedContent && logo ? (
          logo
        ) : !showExpandedContent && logoCollapsed ? (
          logoCollapsed
        ) : (
          <>
            <h1 className="text-on-surface m-0 text-lg font-bold leading-tight">
              {showExpandedContent ? title : 'OE'}
            </h1>
            {showExpandedContent && subtitle && (
              <p className="text-on-surface-variant mt-0.5 truncate text-xs leading-tight">
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>

      <nav
        className="flex flex-col gap-0.5 p-2"
        aria-label="App navigation"
        aria-hidden={inertNav ? true : undefined}
      >
        {items.map((item) => {
          const isActive = item.id === currentItemId;
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'w-full justify-start gap-3 pl-3.5 pr-3 transition-colors',
                !isActive &&
                  'hover:bg-surface-variant/30 hover:text-on-surface text-on-surface-variant',
                inertNav && 'pointer-events-none',
              )}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              data-testid={inertNav ? undefined : `appsidebar-nav-${item.id}`}
              title={!showExpandedContent ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {showExpandedContent && <span className="truncate">{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {sections && sections.length > 0 && (
        <>
          <hr
            className="bg-outline-variant mx-4 my-2 h-px border-none"
            aria-hidden={inertNav ? true : undefined}
          />
          <div
            className={cn('flex-1 overflow-y-auto px-2 py-1', inertNav && 'pointer-events-none')}
            aria-hidden={inertNav ? true : undefined}
          >
            {sections.map((section) => (
              <div key={section.title}>
                {showExpandedContent && (
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
                            'w-full justify-start gap-3 pl-3.5 pr-3 text-left transition-colors',
                            !isCurrent &&
                              'hover:bg-surface-variant/30 hover:text-on-surface text-on-surface-variant',
                          )}
                          onClick={() => step.onClick?.()}
                          aria-current={isCurrent ? 'step' : undefined}
                          aria-label={`${step.label}${stateLabel}`}
                          data-testid={inertNav ? undefined : `step-${step.id}`}
                          title={!showExpandedContent ? step.label : undefined}
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
                          {showExpandedContent && (
                            <span className="truncate text-sm">{step.label}</span>
                          )}
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

      {onBack && showExpandedContent && (
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
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="border-outline-variant text-on-surface-variant hover:bg-surface-container-high flex w-full cursor-pointer items-center justify-center border-t bg-transparent py-2 transition-colors"
      >
        <span className={cn('transition-transform duration-200', collapsed && 'rotate-180')}>
          {ChevronLeft}
        </span>
      </button>
    </>
  );
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

  // Temporary flyout while hovering a pinned-collapsed sidebar.
  // Deliberately separate from `collapsed`: it never calls onCollapseChange and
  // never flips the pinned state.
  const [hoverFlyout, setHoverFlyout] = useState(false);
  const finePointer = useFinePointer();

  const pinnedOpen = !collapsed;
  const showFlyout = collapsed && hoverFlyout && finePointer;

  const handleMouseEnter = useCallback(() => {
    if (collapsed && finePointer) setHoverFlyout(true);
  }, [collapsed, finePointer]);

  const handleMouseLeave = useCallback(() => {
    setHoverFlyout(false);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setHoverFlyout(false);
    const next = !collapsed;
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(next);
    }
    onCollapseChange?.(next);
  }, [collapsed, controlledCollapsed, onCollapseChange]);

  const panelProps = {
    title,
    subtitle,
    logo,
    logoCollapsed,
    items,
    currentItemId,
    onNavigate,
    sections,
    onBack,
    collapsed,
    onToggleCollapse: handleToggleCollapse,
  };

  return (
    <div
      className="relative h-full shrink-0 overflow-visible"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="app-sidebar-host"
    >
      <aside
        className={cn(
          'bg-surface-container border-outline-variant flex h-full flex-col overflow-hidden border-r transition-[width] duration-200',
          pinnedOpen ? 'w-[var(--oe-space-panel-nav)]' : 'w-16',
        )}
        data-testid="app-sidebar"
        aria-label="Main navigation"
      >
        <SidebarPanel showExpandedContent={pinnedOpen} inertNav={showFlyout} {...panelProps} />
      </aside>

      {showFlyout && (
        <aside
          className={cn(
            'bg-surface-container border-outline-variant animate-in fade-in slide-in-from-left-2 absolute left-0 top-0 z-[100] flex h-full w-[var(--oe-space-panel-nav,240px)] min-w-[var(--oe-space-panel-nav,240px)] flex-col overflow-hidden border-r shadow-lg duration-150',
          )}
          data-testid="app-sidebar-flyout"
          aria-label="Main navigation"
        >
          <SidebarPanel showExpandedContent={true} {...panelProps} />
        </aside>
      )}
    </div>
  );
}
