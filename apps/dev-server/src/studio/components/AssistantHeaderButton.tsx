import { cn } from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export function AssistantHeaderButton({ 
  active, 
  onClick 
}: { 
  active: boolean; 
  onClick: () => void; 
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      title={t('studio.assistant.toggle')}
      aria-pressed={active}
    >
      <Sparkles className="size-5" />
    </button>
  );
}