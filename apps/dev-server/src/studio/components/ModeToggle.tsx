import { Switch } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import type { StudioMode } from '../types.js';

export function ModeToggle({
  mode,
  onChange,
  tabIndex,
}: {
  mode: StudioMode;
  onChange: (mode: StudioMode) => void;
  tabIndex?: number;
}) {
  const { t } = useTranslation();
  const checked = mode === 'developer';
  return (
    <label className="text-on-surface-variant flex items-center gap-2 text-sm">
      <span>{t('studio.mode.creator')}</span>
      <Switch
        checked={checked}
        onCheckedChange={(value) => onChange(value ? 'developer' : 'creator')}
        aria-label={t('studio.mode.toggleLabel')}
        tabIndex={tabIndex}
      />
      <span>{t('studio.mode.developer')}</span>
    </label>
  );
}
