import { AppBanner, Button, Pipili } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import type { BreakTimerSettings } from './breakTimerStorage';

export interface BreakNagBarProps {
  mode: BreakTimerSettings['mode'];
  onTakeBreak: () => void;
  onIgnore: () => void;
}

export function BreakNagBar({ mode, onTakeBreak, onIgnore }: BreakNagBarProps): JSX.Element {
  const { t } = useTranslation('learner');
  const minLabel = mode === 'off' ? '' : `${mode}`;

  return (
    <AppBanner
      variant="break"
      icon={<Pipili size="sm" mood="curious" />}
      onDismiss={onIgnore}
      actions={
        <>
          <Button variant="default" size="sm" onClick={onTakeBreak}>
            Take Break
          </Button>
          <Button variant="ghost" size="sm" onClick={onIgnore}>
            Ignore
          </Button>
        </>
      }
    >
      <p>
        <strong className="font-semibold">{t('learner.break.time_for_break')}</strong>{' '}
        {minLabel && (
          <>You've been learning for {minLabel} minutes. {t('learner.break.stand_up')}</>
        )}
        {!minLabel && <>{t('learner.break.stand_up')}</>}
      </p>
    </AppBanner>
  );
}
