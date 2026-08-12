import { cn } from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export function AssistantHeaderButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex size-10 items-center justify-center rounded-full transition-colors',
        active
          ? 'bg-primary text-on-primary'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
      )}
      title={t('studio.assistant.toggle')}
      aria-label={active ? t('studio.assistant.close') : t('studio.assistant.open')}
      aria-pressed={active}
    >
      <Sparkles className="size-5" />
    </button>
  );
}
