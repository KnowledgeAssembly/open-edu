import { CheckCircle2, Circle } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export interface CoachingCheck {
  id: string;
  passed: boolean;
  label: string;
}

export function EditorCoachingPanel({ checks, tips }: { checks: CoachingCheck[]; tips: string[] }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="editor-coaching-heading" className="w-full lg:w-80 lg:shrink-0">
      <h2 id="editor-coaching-heading" className="text-h3 text-on-surface mb-3">
        {t('studio.editor.coaching.title')}
      </h2>
      <ul className="space-y-2">
        {checks.map((check) => (
          <li key={check.id} className="text-on-surface-variant flex items-start gap-2 text-sm">
            {check.passed ? (
              <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Circle
                className="text-on-surface-variant mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
            )}
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
      {tips.length > 0 ? (
        <>
          <h3 className="text-on-surface-variant text-label-caps text-primary mb-2 mt-6">
            {t('studio.editor.coaching.tipsTitle')}
          </h3>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="text-on-surface-variant text-sm">
                {tip}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
