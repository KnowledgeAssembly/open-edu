import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Textarea,
  EmptyState,
} from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { StudioApi } from '../studioApi.js';
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

  const handleGenerate = async () => {
    if (notes.trim().length === 0) return;
    setGenerating(true);
    setInlineError(null);
    try {
      const result = await api.generateFromNotes(notes);
      if (result.success) {
        onGenerated(result);
      } else {
        setInlineError(
          result.error?.includes('Add more detail')
            ? t('studio.ai.notesTooShort')
            : t('studio.ai.errorGeneric'),
        );
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.ai.errorGeneric'));
    } finally {
      setGenerating(false);
    }
  };

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
            onClick={() => void handleGenerate()}
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
  );
}
