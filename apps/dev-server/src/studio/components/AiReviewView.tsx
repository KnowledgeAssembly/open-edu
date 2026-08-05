import { Button, Badge } from '@open-edu/design-system';
import { Check, X } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { AiGenerateResult } from '../ai/types.js';

function kindLabelKey(kind: string): string {
  switch (kind) {
    case 'lesson':
      return 'studio.outline.kind.lesson';
    case 'quiz':
      return 'studio.outline.kind.quiz';
    case 'practice':
      return 'studio.outline.kind.practice';
    default:
      return 'studio.outline.kind.other';
  }
}

export function AiReviewView({
  result,
  onAccept,
  onReject,
}: {
  result: AiGenerateResult;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-h1 text-on-surface">{t('studio.ai.reviewTitle')}</h1>
        <p className="text-on-surface-variant mt-2">{t('studio.ai.reviewLede')}</p>
      </div>

      <section aria-labelledby="ai-draft-outline-heading">
        <h2 id="ai-draft-outline-heading" className="text-h2 text-on-surface mb-4">
          {t('studio.ai.outlineHeading')}
        </h2>
        <ul className="border-outline-variant bg-surface divide-outline-variant divide-y rounded-lg border">
          {result.outlinePreview.map((item, index) => (
            <li key={index} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-on-surface text-sm font-medium">{item.title}</span>
              <Badge variant="outline" className="text-on-surface-variant">
                {t(kindLabelKey(item.kind))}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ai-quality-heading">
        <h2 id="ai-quality-heading" className="text-h2 text-on-surface mb-4">
          {t('studio.ai.qualityHeading')}
        </h2>
        <ul className="border-outline-variant bg-surface divide-outline-variant divide-y rounded-lg border">
          {result.quality.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              {item.passed ? (
                <Check className="text-success mt-0.5 size-5 shrink-0" aria-hidden="true" />
              ) : (
                <X className="text-error mt-0.5 size-5 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p
                  className={
                    item.passed
                      ? 'text-on-surface text-sm font-medium'
                      : 'text-error text-sm font-medium'
                  }
                >
                  {t(item.labelKey)}
                </p>
                {item.detail ? (
                  <p className="text-on-surface-variant mt-1 text-xs">{item.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="default" size="sm" onClick={onAccept}>
          {t('studio.ai.accept')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onReject}>
          {t('studio.ai.reject')}
        </Button>
      </div>
      <p className="text-on-surface-variant text-sm">{t('studio.ai.rejectWarning')}</p>
    </div>
  );
}
