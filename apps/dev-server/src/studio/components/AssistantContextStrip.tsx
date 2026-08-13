import { useTranslation } from '@open-edu/i18n';
import { useStudioAssistant, resolveSuggestions } from '../ai';
import type { SuggestionChip } from '../ai/suggestions';

interface SuggestionChipProps {
  chip: SuggestionChip;
  onSend: (message: string) => void;
}

function SuggestionChipItem({ chip, onSend }: SuggestionChipProps) {
  return (
    <button
      type="button"
      onClick={() => onSend(chip.action.message)}
      className="border-outline-variant bg-surface text-on-surface-variant hover:border-primary hover:text-primary whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors"
    >
      {chip.label}
    </button>
  );
}

export function AssistantContextStrip({ onSend }: { onSend: (msg: string) => void }) {
  const { t } = useTranslation();
  const { context, ephemeralSuggestions, setEphemeralSuggestions } = useStudioAssistant();

  if (!context) return null;

  const suggestions =
    ephemeralSuggestions && ephemeralSuggestions.length > 0
      ? ephemeralSuggestions
      : resolveSuggestions(context, t);

  const handleSend = (message: string) => {
    if (ephemeralSuggestions?.length) {
      setEphemeralSuggestions(null);
    }
    onSend(message);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2">
        {suggestions.map((chip) => (
          <SuggestionChipItem key={chip.id} chip={chip} onSend={handleSend} />
        ))}
      </div>

      <div className="text-on-surface-variant text-[10px] font-medium uppercase tracking-wider">
        {context.view === 'home'
          ? t('studio.assistant.context.home')
          : context.view === 'outline'
            ? t('studio.assistant.context.outline', {
                count: String(context.course?.activityCount ?? ''),
              })
            : context.view === 'edit-activity'
              ? t('studio.assistant.context.editing', {
                  title: context.activity?.title ?? '',
                })
              : context.view}
      </div>
    </div>
  );
}
