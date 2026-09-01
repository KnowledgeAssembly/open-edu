import { cn, Button, OpenEduLogo } from '@open-edu/design-system';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@open-edu/design-system';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { ThemeId } from '@open-edu/runtime';
import { ModeToggle } from './ModeToggle.js';
import { AssistantHeaderButton } from './AssistantHeaderButton.js';
import { ThemeSwitcher } from './ThemeSwitcher.js';
import type { StudioMode, StudioView } from '../types.js';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export function StudioChrome({
  mode,
  onModeChange,
  onNavigate,
  courseTitle,
  view,
  minimal = false,
  activityLabel,
  panelOpen: panelOpenProp,
  setPanelOpen: setPanelOpenProp,
  themeId,
  onThemeChange,
  targetLearnerKind,
  onTargetLearnerKindChange,
}: {
  mode: StudioMode;
  onModeChange: (m: StudioMode) => void;
  onNavigate: (view: StudioView) => void;
  courseTitle?: string;
  view: StudioView;
  minimal?: boolean;
  activityLabel?: string;
  panelOpen?: boolean;
  setPanelOpen?: (open: boolean) => void;
  themeId?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
  targetLearnerKind?: string;
  onTargetLearnerKindChange?: (kind: string) => void;
}) {
  const { t } = useTranslation();
  const panelOpen = panelOpenProp ?? false;
  const setPanelOpen = setPanelOpenProp ?? (() => {});
  const breadcrumbs: BreadcrumbItem[] = [];

  if (view !== 'home') {
    breadcrumbs.push({ label: t('studio.nav.home'), onClick: () => onNavigate('home') });
  }
  if (view === 'library') {
    breadcrumbs.push({ label: t('studio.nav.library') });
  } else if (view === 'outline' && courseTitle) {
    breadcrumbs.push({ label: courseTitle });
    breadcrumbs.push({ label: t('studio.nav.outline') });
  } else if (view === 'preview' && courseTitle) {
    breadcrumbs.push({ label: courseTitle });
    breadcrumbs.push({ label: t('studio.nav.preview') });
  } else if (view === 'share' && courseTitle) {
    breadcrumbs.push({ label: courseTitle });
    breadcrumbs.push({ label: t('studio.nav.share') });
  } else if (view === 'edit-activity' && courseTitle) {
    breadcrumbs.push({ label: courseTitle });
    breadcrumbs.push({ label: activityLabel ?? t('studio.nav.editActivity') });
  }

  const navItems: Array<{ view: StudioView; labelKey: string }> = [
    { view: 'home', labelKey: 'studio.nav.home' },
    { view: 'library', labelKey: 'studio.nav.library' },
    { view: 'outline', labelKey: 'studio.nav.outline' },
    { view: 'preview', labelKey: 'studio.nav.preview' },
  ];

  const needsCourse = !courseTitle;

  const requiresCourse = (view: StudioView) => needsCourse && view !== 'library' && view !== 'home';

  const shareBtn = (
    <Button variant="default" size="sm" disabled={needsCourse} onClick={() => onNavigate('share')}>
      {t('studio.nav.share')}
    </Button>
  );
  const shareAction = needsCourse ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{shareBtn}</span>
        </TooltipTrigger>
        <TooltipContent>{t('studio.nav.needsCourse')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    shareBtn
  );

  const renderNavButton = (navItem: { view: StudioView; labelKey: string }) => {
    const isActive = view === navItem.view;
    const btn = (
      <Button
        variant="ghost"
        size="sm"
        disabled={requiresCourse(navItem.view)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(isActive && 'bg-primary/10 text-primary')}
        onClick={() => onNavigate(navItem.view)}
      >
        {t(navItem.labelKey)}
      </Button>
    );
    if (requiresCourse(navItem.view)) {
      return (
        <TooltipProvider key={navItem.view}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{btn}</span>
            </TooltipTrigger>
            <TooltipContent>{t('studio.nav.needsCourse')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <span key={navItem.view}>{btn}</span>;
  };

  return (
    <header
      className={cn('border-outline-variant bg-surface flex items-center gap-3 border-b px-4 py-2')}
    >
      <div className="flex items-center gap-2">
        <OpenEduLogo variant="symbol" size="sm" />
        <span className="text-on-surface font-semibold">{t('studio.brand.name')}</span>
        <span className="text-on-surface-variant hidden text-sm font-normal md:inline">
          {t('studio.brand.subtitle')}
        </span>
      </div>

      {breadcrumbs.length > 0 ? (
        <nav
          aria-label={t('studio.breadcrumbs.label')}
          className="hidden items-center gap-1 md:flex"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="text-on-surface-variant size-3.5" aria-hidden="true" />
              ) : null}
              {crumb.onClick ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-on-surface-variant text-xs"
                  onClick={crumb.onClick}
                >
                  {crumb.label}
                </Button>
              ) : (
                <span className="text-on-surface-variant text-xs">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex-1" />

      {!minimal ? (
        <>
          <div className="hidden items-center gap-1 md:flex">{navItems.map(renderNavButton)}</div>
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={t('studio.nav.moreMenu')}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navItems.map((navItem) => (
                  <DropdownMenuItem
                    key={navItem.view}
                    disabled={requiresCourse(navItem.view)}
                    onSelect={() => onNavigate(navItem.view)}
                  >
                    {t(navItem.labelKey)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="p-2 md:hidden">
                  <ModeToggle mode={mode} onChange={onModeChange} />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {shareAction}
        </>
      ) : null}

      <div className="flex items-center gap-2">
        {onTargetLearnerKindChange && targetLearnerKind && (
          <select
            aria-label={t('studio.nav.targetLearner')}
            className="border-outline-variant bg-surface-container text-on-surface rounded border px-2 py-1 text-xs"
            value={targetLearnerKind}
            onChange={(e) => onTargetLearnerKindChange(e.target.value)}
          >
            <option value="neurotypical">{t('studio.nav.targetNeurotypical')}</option>
            <option value="autism">{t('studio.nav.targetAutism')}</option>
            <option value="school">{t('studio.nav.targetSchool')}</option>
            <option value="college">{t('studio.nav.targetCollege')}</option>
          </select>
        )}
        {mode === 'creator' && setPanelOpenProp && (
          <AssistantHeaderButton active={panelOpen} onClick={() => setPanelOpen(!panelOpen)} />
        )}
        {themeId && onThemeChange && (
          <ThemeSwitcher currentThemeId={themeId} onChange={onThemeChange} />
        )}
        <div className="hidden md:flex">
          <ModeToggle mode={mode} onChange={onModeChange} />
        </div>
      </div>
    </header>
  );
}
