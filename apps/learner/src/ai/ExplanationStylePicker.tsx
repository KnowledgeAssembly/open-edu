import { useTranslation } from '@open-edu/i18n';
import { cn } from '@open-edu/design-system';
import type { ExplanationStyle } from '@open-edu/ai-companion';
import { useCompanion } from './CompanionProvider.js';

const STYLES: Array<{ id: ExplanationStyle; labelKey: string }> = [
  { id: 'simple', labelKey: 'learner.explanation_style.simple' },
  { id: 'detailed', labelKey: 'learner.explanation_style.detailed' },
  { id: 'exam', labelKey: 'learner.explanation_style.exam' },
  { id: 'child_friendly', labelKey: 'learner.explanation_style.child_friendly' },
  { id: 'autism_friendly', labelKey: 'learner.explanation_style.autism_friendly' },
];

export function ExplanationStylePicker(): JSX.Element {
  const { t } = useTranslation();
  const { explanationStyle, setExplanationStyle } = useCompanion();

  return (
    <div
      role="group"
      aria-label={t('learner.explanation_style.label')}
      data-testid="explanation-style-picker"
    >
      <p className="text-on-surface-muted text-caption mb-1.5">
        {t('learner.explanation_style.label')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STYLES.map((s) => {
          const active = explanationStyle === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              data-testid={`explanation-style-${s.id}`}
              onClick={() => setExplanationStyle(s.id)}
              className={cn(
                'text-caption rounded-full border px-2.5 py-1 transition-colors',
                active
                  ? 'border-primary bg-primary-container text-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary',
              )}
            >
              {t(s.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
