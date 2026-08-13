import { useState } from 'react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Spinner,
} from '@open-edu/design-system';
import { Check, X } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { CourseDraftResult } from '../ai/types';

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

export function AssistantCourseDraftCard({
  courseDraft,
  onAccept,
  onDiscard,
  accepting,
}: {
  courseDraft: CourseDraftResult;
  onAccept: (force: boolean) => void;
  onDiscard: () => void;
  accepting?: boolean;
}) {
  const { t } = useTranslation();
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(false);

  const handleAccept = () => {
    setOverwriteConfirm(true);
  };

  const handleOverwriteConfirmed = () => {
    setOverwriteConfirm(false);
    onAccept(true);
  };

  const handleOverwriteCancelled = () => {
    setOverwriteConfirm(false);
    onAccept(false);
  };

  return (
    <div className="border-outline-variant bg-surface rounded-lg border p-3">
      {courseDraft.title ? (
        <h4 className="text-on-surface mb-3 text-sm font-semibold">
          {t('studio.assistant.courseDraft.title', { title: courseDraft.title })}
        </h4>
      ) : null}

{courseDraft.success ? (
          <>
            <section className="mb-3" aria-labelledby="course-draft-outline-heading">
              <h5
                id="course-draft-outline-heading"
                className="text-on-surface-variant mb-2 text-xs font-medium uppercase tracking-wider"
              >
                {t('studio.assistant.courseDraft.outline')}
              </h5>
              <ul className="border-outline-variant divide-outline-variant divide-y rounded-md border">
                {courseDraft.outlinePreview.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <span className="text-on-surface truncate text-xs">{item.title}</span>
                    <Badge variant="outline" className="text-[10px] leading-tight">
                      {t(kindLabelKey(item.kind))}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-3" aria-labelledby="course-draft-quality-heading">
              <h5
                id="course-draft-quality-heading"
                className="text-on-surface-variant mb-2 text-xs font-medium uppercase tracking-wider"
              >
                {t('studio.assistant.courseDraft.quality')}
              </h5>
              <ul className="space-y-1">
                {courseDraft.quality.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    {item.passed ? (
                      <Check className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <X className="text-error mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span
                      className={
                        item.passed
                          ? 'text-on-surface text-[11px]'
                          : 'text-error text-[11px]'
                      }
                    >
                      {t(item.labelKey)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <p className="text-error text-xs">{courseDraft.error || 'Draft generation failed'}</p>
        )}

      {courseDraft.success && (
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <Spinner aria-label={t('studio.assistant.courseDraft.accepting')} />
            ) : (
              <Check className="mr-1 size-3" aria-hidden="true" />
            )}
            {t('studio.assistant.courseDraft.accept')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiscardConfirm(true)}
            disabled={accepting}
            aria-label={t('studio.assistant.courseDraft.discard')}
          >
            <X className="size-3" aria-hidden="true" />
          </Button>
        </div>
      )}

      <Dialog open={discardConfirm} onOpenChange={setDiscardConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('studio.assistant.courseDraft.discardConfirm')}</DialogTitle>
            <DialogDescription>
              {t('studio.assistant.courseDraft.discardLede')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDiscardConfirm(false)}>
              {t('studio.assistant.courseDraft.overwriteCancel')}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setDiscardConfirm(false);
                onDiscard();
              }}
            >
              {t('studio.assistant.courseDraft.discard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overwriteConfirm} onOpenChange={setOverwriteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('studio.assistant.courseDraft.overwriteTitle')}</DialogTitle>
            <DialogDescription>
              {t('studio.assistant.courseDraft.overwriteLede')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOverwriteConfirm(false)}>
              {t('studio.assistant.courseDraft.overwriteCancel')}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleOverwriteConfirmed}
            >
              {t('studio.assistant.courseDraft.overwriteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}