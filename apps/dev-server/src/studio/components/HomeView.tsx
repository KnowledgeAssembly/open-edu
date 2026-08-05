import { useState } from 'react';
import {
  Button,
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { STUDIO_TEMPLATES } from '../templates/catalog.js';
import { listRecentCourses } from '../recentCourses.js';
import { AiStartPanel } from './AiStartPanel.js';
import type { StudioApi } from '../studioApi.js';
import type { AiGenerateResult } from '../ai/types.js';

export function HomeView({
  api,
  onOpened,
  onError,
  courseTitle,
  onOpenCurrent,
  onAiGenerated,
}: {
  api: StudioApi;
  onOpened: () => void;
  onError: (message: string) => void;
  courseTitle?: string;
  onOpenCurrent: () => void;
  onAiGenerated: (result: AiGenerateResult) => void;
}) {
  const { t } = useTranslation();
  const recent = listRecentCourses();
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const handleConfirmOverwrite = async () => {
    if (!pendingTemplateId) return;
    setApplying(true);
    try {
      await api.applyTemplate(pendingTemplateId);
      setPendingTemplateId(null);
      onOpened();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-h1 text-on-surface">{t('studio.home.title')}</h1>
        <p className="text-on-surface-variant mt-2">{t('studio.home.lede')}</p>
      </div>

      {courseTitle ? (
        <section aria-labelledby="studio-continue-heading">
          <h2 id="studio-continue-heading" className="text-h2 text-on-surface mb-4">
            {t('studio.home.continueHeading')}
          </h2>
          <Card className="border-outline-variant bg-surface">
            <CardTitle className="text-on-surface px-6 pt-6">{courseTitle}</CardTitle>
            <CardDescription className="px-6 pt-2">{t('studio.home.continueLede')}</CardDescription>
            <CardContent className="flex items-center gap-3 px-6 pt-4">
              <Button variant="default" size="sm" onClick={onOpenCurrent}>
                {t('studio.home.openCurrentCourse')}
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="studio-templates-heading">
        <h2 id="studio-templates-heading" className="text-h2 text-on-surface mb-4">
          {t('studio.home.templatesHeading')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STUDIO_TEMPLATES.map((template) => (
            <Card key={template.id} className="border-outline-variant bg-surface">
              <CardTitle className="text-on-surface px-6 pt-6">{t(template.titleKey)}</CardTitle>
              <CardDescription className="px-6 pt-2">{t(template.descriptionKey)}</CardDescription>
              <CardContent className="flex items-center gap-3 px-6 pt-4">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setPendingTemplateId(template.id)}
                >
                  {t('studio.home.useTemplate')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="studio-ai-heading">
        <h2 id="studio-ai-heading" className="text-h2 text-on-surface mb-4">
          {t('studio.home.aiHeading')}
        </h2>
        <AiStartPanel api={api} onGenerated={onAiGenerated} onError={onError} />
      </section>

      <section aria-labelledby="studio-recent-heading">
        <h2 id="studio-recent-heading" className="text-h2 text-on-surface mb-4">
          {t('studio.home.recentHeading')}
        </h2>
        {recent.length === 0 ? (
          <EmptyState heading={t('studio.home.emptyRecent')} description="" />
        ) : (
          <ul className="border-outline-variant bg-surface divide-outline-variant divide-y rounded-lg border">
            {recent.map((course) => (
              <li key={course.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-on-surface text-sm">{course.title}</span>
                <Button variant="ghost" size="sm" onClick={onOpened}>
                  {t('studio.home.open')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={pendingTemplateId !== null}
        onOpenChange={(open) => {
          if (!open && !applying) setPendingTemplateId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studio.home.overwriteTitle')}</DialogTitle>
            <DialogDescription>{t('studio.home.overwriteLede')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={applying}
              onClick={() => setPendingTemplateId(null)}
            >
              {t('studio.home.overwriteCancel')}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={applying}
              onClick={() => void handleConfirmOverwrite()}
            >
              {t('studio.home.overwriteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
