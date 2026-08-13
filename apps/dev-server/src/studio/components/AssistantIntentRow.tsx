import { Button } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { Sparkles } from 'lucide-react';
import type { ItemIntent, ItemIntentParams } from '../ai/types';

const INTENTS_BY_KIND: Record<
  string,
  Array<{ intent: ItemIntent; labelKey: string; params?: ItemIntentParams }>
> = {
  lesson: [
    { intent: 'rewrite', labelKey: 'studio.assistant.intent.rewrite' },
    { intent: 'expand', labelKey: 'studio.assistant.intent.expand' },
    { intent: 'fix-quality', labelKey: 'studio.assistant.intent.fix-quality' },
    {
      intent: 'difficulty',
      labelKey: 'studio.assistant.intent.difficulty.easier',
      params: { direction: 'easier' } as ItemIntentParams,
    },
    {
      intent: 'difficulty',
      labelKey: 'studio.assistant.intent.difficulty.harder',
      params: { direction: 'harder' } as ItemIntentParams,
    },
    { intent: 'translate', labelKey: 'studio.assistant.intent.translate' },
  ],
  quiz: [
    { intent: 'rewrite', labelKey: 'studio.assistant.intent.rewrite' },
    { intent: 'fix-quality', labelKey: 'studio.assistant.intent.fix-quality' },
    {
      intent: 'difficulty',
      labelKey: 'studio.assistant.intent.difficulty.easier',
      params: { direction: 'easier' } as ItemIntentParams,
    },
    {
      intent: 'difficulty',
      labelKey: 'studio.assistant.intent.difficulty.harder',
      params: { direction: 'harder' } as ItemIntentParams,
    },
    { intent: 'translate', labelKey: 'studio.assistant.intent.translate' },
    { intent: 'add-questions', labelKey: 'studio.assistant.intent.add-questions' },
  ],
  practice: [
    { intent: 'improve-prompt', labelKey: 'studio.assistant.intent.improve-prompt' },
    {
      intent: 'difficulty',
      labelKey: 'studio.assistant.intent.difficulty.easier',
      params: { direction: 'easier' } as ItemIntentParams,
    },
    {
      intent: 'difficulty',
      labelKey: 'studio.assistant.intent.difficulty.harder',
      params: { direction: 'harder' } as ItemIntentParams,
    },
    { intent: 'translate', labelKey: 'studio.assistant.intent.translate' },
  ],
};

export function AssistantIntentRow({
  kind,
  onRunIntent,
  running,
}: {
  kind: 'lesson' | 'quiz' | 'practice';
  onRunIntent: (intent: ItemIntent, params?: ItemIntentParams) => void;
  running: boolean;
}) {
  const { t } = useTranslation();
  const intents = INTENTS_BY_KIND[kind];

  if (!intents) return null;

  return (
    <div className="border-outline-variant bg-surface space-y-2 border-t p-3">
      <div className="text-on-surface-variant flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider">
        <Sparkles className="size-3" aria-hidden="true" />
        {t('studio.ai.item.panelHint')}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {intents.map((item) => (
          <Button
            key={`${item.intent}-${(item.params as Record<string, string>)?.direction || ''}`}
            variant="outline"
            size="sm"
            className="text-[11px]"
            disabled={running}
            onClick={() => onRunIntent(item.intent, item.params)}
          >
            {t(item.labelKey)}
          </Button>
        ))}
      </div>
    </div>
  );
}