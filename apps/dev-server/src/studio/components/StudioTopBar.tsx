import { Button, cn } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { ModeToggle } from './ModeToggle.js';
import type { StudioMode, StudioView } from '../types.js';

export function StudioTopBar({
  mode,
  onModeChange,
  view,
  onNavigate,
  courseTitle,
}: {
  mode: StudioMode;
  onModeChange: (m: StudioMode) => void;
  view: StudioView;
  onNavigate: (view: StudioView) => void;
  courseTitle?: string;
}) {
  const { t } = useTranslation();
  return (
    <header
      className={cn(
        'border-outline-variant bg-surface flex flex-wrap items-center gap-3 border-b px-4 py-3',
      )}
    >
      <div className="text-on-surface font-semibold tracking-tight">
        {t('studio.brand.name')}
        <span className="text-on-surface-variant ml-2 text-sm font-normal">
          {t('studio.brand.subtitle')}
        </span>
      </div>
      {courseTitle ? <span className="text-on-surface-variant text-sm">{courseTitle}</span> : null}
      <div className="flex-1" />
      {view !== 'home' ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('outline')}>
            {t('studio.nav.outline')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('preview')}>
            {t('studio.nav.preview')}
          </Button>
          <Button variant="default" size="sm" onClick={() => onNavigate('share')}>
            {t('studio.nav.share')}
          </Button>
        </>
      ) : null}
      <ModeToggle mode={mode} onChange={onModeChange} />
    </header>
  );
}
