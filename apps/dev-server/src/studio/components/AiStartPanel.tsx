import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Textarea,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { StudioApi, StudioApiError } from '../studioApi.js';
import type { AiGenerateResult } from '../ai/types.js';

type Status = 'checking' | 'available' | 'unavailable';

export function AiStartPanel({
  api,
  onGenerated,
  onError,
}: {
  api: StudioApi;
  onGenerated: (result: AiGenerateResult) => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('checking');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getAiStatus()
      .then(({ available }) => {
        if (!cancelled) setStatus(available ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const runGenerate = async (force: boolean) => {
    if (notes.trim().length === 0) return;
    setGenerating(true);
    setInlineError(null);
    try {
      const result = await api.generateFromNotes(notes, force);
      if (result.success) {
        setConfirmOverwrite(false);
        onGenerated(result);
      } else if (result.code === 'has-content') {
        setConfirmOverwrite(true);
      } else {
        setInlineError(
          result.code === 'notes-too-short'
            ? t('studio.ai.notesTooShort')
            : t('studio.ai.errorGeneric'),
        );
      }
    } catch (err) {
      const error = err as StudioApiError;
      if (error.code === 'no-active-package') {
        onError(t('studio.ai.noActivePackage'));
      } else if (error.code === 'missing-notes') {
        onError(t('studio.ai.notesTooShort'));
      } else {
        onError(error instanceof Error ? error.message : t('studio.ai.errorGeneric'));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => void runGenerate(false);
  const handleConfirmOverwrite = () => void runGenerate(true);

  if (status === 'unavailable') {
    return (
      <Card className="border-outline-variant bg-surface">
        <CardTitle className="text-on-surface px-6 pt-6">{t('studio.home.aiHeading')}</CardTitle>
        <CardDescription className="px-6 pt-2">{t('studio.home.aiLede')}</CardDescription>
        <CardContent className="px-6 pb-6 pt-4">
          <EmptyState
            heading={t('studio.ai.unavailable')}
            description={t('studio.ai.useTemplateHint')}
          />
        </CardContent>
      </Card>
    );
  }

  if (status === 'checking') {
    return (
      <Card className="border-outline-variant bg-surface">
        <CardTitle className="text-on-surface px-6 pt-6">{t('studio.home.aiHeading')}</CardTitle>
        <CardDescription className="px-6 pt-2">{t('studio.home.aiLede')}</CardDescription>
        <CardContent className="text-on-surface-variant px-6 pb-6 pt-4 text-sm">…</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-outline-variant bg-surface">
        <CardTitle className="text-on-surface px-6 pt-6">{t('studio.home.aiHeading')}</CardTitle>
        <CardDescription className="px-6 pt-2">{t('studio.home.aiLede')}</CardDescription>
        <CardContent className="space-y-4 px-6 pb-6 pt-4">
          <label className="text-on-surface block text-sm font-medium">
            {t('studio.ai.notesLabel')}
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('studio.ai.notesPlaceholder')}
              rows={4}
              className="text-on-surface mt-2"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              disabled={generating || notes.trim().length === 0}
              onClick={handleGenerate}
            >
              <Sparkles className="mr-1 size-4" aria-hidden="true" />
              {generating ? t('studio.ai.generating') : t('studio.ai.generate')}
            </Button>
          </div>
          {inlineError ? (
            <p className="text-error text-sm" role="alert">
              {inlineError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirmOverwrite} onOpenChange={(open) => setConfirmOverwrite(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studio.ai.overwriteTitle')}</DialogTitle>
            <DialogDescription>{t('studio.ai.overwriteLede')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={() => setConfirmOverwrite(false)}
            >
              {t('studio.ai.overwriteCancel')}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={generating}
              onClick={handleConfirmOverwrite}
            >
              {t('studio.ai.overwriteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
