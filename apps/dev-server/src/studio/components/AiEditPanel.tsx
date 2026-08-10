import { useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { ItemDraftPreview } from './ItemDraftPreview.js';
import type { StudioApi, StudioApiError } from '../studioApi.js';
import type { DraftItem, ItemIntent, ItemIntentParams } from '../ai/types.js';

type ItemKind = DraftItem['kind'];

const INTENTS_BY_KIND: Record<ItemKind, ItemIntent[]> = {
  lesson: ['rewrite', 'expand', 'fix-quality', 'difficulty', 'translate'],
  quiz: ['rewrite', 'fix-quality', 'difficulty', 'translate', 'add-questions'],
  practice: ['improve-prompt', 'difficulty', 'translate'],
};

type Status = 'checking' | 'available' | 'unavailable';

export function AiEditPanel({
  api,
  kind,
  getCurrentContent,
  onApply,
  onApplyBatch,
  onError,
}: {
  api: StudioApi;
  kind: ItemKind;
  getCurrentContent: () => string;
  onApply: (item: DraftItem) => void;
  onApplyBatch: (items: DraftItem[]) => void;
  onError: (message: string) => void;
}) {
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<Status>('checking');
  const [running, setRunning] = useState<ItemIntent | null>(null);
  const [items, setItems] = useState<DraftItem[] | null>(null);
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

  const runIntent = async (intent: ItemIntent, params?: ItemIntentParams) => {
    if (status !== 'available' || running) return;
    setRunning(intent);
    setItems(null);
    setInlineError(null);
    try {
      const resolvedParams: ItemIntentParams | undefined =
        intent === 'translate' ? { targetLocale: locale } : params;
      const result = await api.generateItemEdit(kind, intent, getCurrentContent(), resolvedParams);
      if (result.ok) {
        setItems(result.items);
      } else {
        setInlineError(t('studio.ai.item.retryFailed'));
      }
    } catch (err) {
      const error = err as StudioApiError;
      if (error.code === 'no-active-package') {
        onError(t('studio.ai.noActivePackage'));
      } else if (error.code === 'ai-unavailable') {
        setInlineError(t('studio.ai.unavailable'));
      } else {
        setInlineError(error instanceof Error ? error.message : t('studio.ai.item.error'));
      }
    } finally {
      setRunning(null);
    }
  };

  const handleApply = () => {
    if (!items) return;
    if (items.length === 1) {
      onApply(items[0]!);
    } else {
      onApplyBatch(items);
    }
    setItems(null);
  };

  const handleReject = () => {
    setItems(null);
    setInlineError(null);
  };

  const unavailable = status === 'unavailable';

  return (
    <Card className="border-outline-variant bg-surface w-full lg:w-80 lg:shrink-0">
      <CardHeader>
        <CardTitle className="text-h3 text-on-surface flex items-center gap-2">
          <Sparkles className="text-primary h-4 w-4" aria-hidden="true" />
          {t('studio.ai.item.panelTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-on-surface-variant text-sm">{t('studio.ai.item.panelHint')}</p>

        {unavailable ? (
          <p className="text-on-surface-variant text-sm">{t('studio.ai.unavailable')}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {INTENTS_BY_KIND[kind]
                .filter((intent) => intent !== 'difficulty')
                .map((intent) => (
                  <Button
                    key={intent}
                    variant="outline"
                    size="sm"
                    disabled={status === 'checking' || running !== null}
                    onClick={() => void runIntent(intent)}
                  >
                    {t(`studio.ai.item.intents.${intent}`)}
                  </Button>
                ))}
            </div>
            <div className="space-y-2">
              <p className="text-on-surface-variant text-sm font-medium">
                {t('studio.ai.item.intents.difficulty')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={status === 'checking' || running !== null}
                  onClick={() => void runIntent('difficulty', { direction: 'easier' })}
                >
                  {t('studio.ai.item.intents.difficulty.easier')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={status === 'checking' || running !== null}
                  onClick={() => void runIntent('difficulty', { direction: 'harder' })}
                >
                  {t('studio.ai.item.intents.difficulty.harder')}
                </Button>
              </div>
            </div>
          </>
        )}

        {running ? (
          <p className="text-on-surface-variant text-sm" role="status">
            {t('studio.ai.item.generating')}
          </p>
        ) : null}
        {inlineError ? (
          <p className="text-error text-sm" role="alert">
            {inlineError}
          </p>
        ) : null}
        {items ? (
          <>
            {items.length > 1 ? (
              <p className="text-on-surface-variant text-sm">
                {t('studio.ai.item.addQuestionsCount', { count: String(items.length) })}
              </p>
            ) : null}
            <ItemDraftPreview item={items[0]!} currentContent={getCurrentContent()} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReject}>
                {t('studio.ai.item.reject')}
              </Button>
              <Button variant="default" size="sm" onClick={handleApply}>
                {t('studio.ai.item.use')}
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
