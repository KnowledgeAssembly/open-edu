import { Button } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { ModeToggle } from '../studio/components/ModeToggle.js';
import type { StudioMode } from '../studio/types.js';

export function DeveloperToolbar({
  mode,
  onModeChange,
  onEdit,
  onReset,
  onOverview,
}: {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  onEdit?: () => void;
  onReset: () => void;
  onOverview?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-outline-variant bg-surface-container-low flex items-center gap-3 border-b px-4 py-2">
      <span className="text-on-surface-variant text-xs font-medium">
        {t('studio.developer.toolsLabel')}
      </span>
      {onEdit ? (
        <Button variant="outline" size="sm" onClick={onEdit}>
          {t('studio.developer.editPackage')}
        </Button>
      ) : null}
      {onOverview ? (
        <Button variant="outline" size="sm" onClick={onOverview}>
          {t('studio.developer.bundleOverview')}
        </Button>
      ) : null}
      <Button variant="outline" size="sm" onClick={onReset}>
        {t('studio.developer.resetProgress')}
      </Button>
      <div className="flex-1" />
      <ModeToggle mode={mode} onChange={onModeChange} tabIndex={-1} />
    </div>
  );
}
