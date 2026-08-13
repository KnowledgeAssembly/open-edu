import { useEffect, useState } from 'react';
import { Button, Input, Textarea } from '@open-edu/design-system';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { EditorCoachingPanel } from './EditorCoachingPanel.js';
import type { StudioApi } from '../studioApi.js';

function serializeReflection(title: string, prompt: string): string {
  return JSON.stringify({ type: 'reflection', title, prompt }, null, 2);
}

export function ReflectionActivityEditor({
  api,
  path,
  onSaved,
  onError,
  onCancel,
}: {
  api: StudioApi;
  path: string;
  onSaved: () => void;
  onError: (message: string) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .readFile(path)
      .then((file) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(file.content) as { title?: string; prompt?: string };
          setTitle(parsed.title ?? '');
          setPrompt(parsed.prompt ?? '');
        } catch {
          // keep defaults on unparseable content
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) onError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, path, onError]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.writeFile(path, serializeReflection(title, prompt));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" aria-busy>
        <p className="text-on-surface-variant text-sm">{t('studio.editor.reflection.loading')}</p>
      </div>
    );
  }

  const hasPrompt = prompt.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-outline-variant bg-surface flex items-center gap-2 border-b px-4 py-2">
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel} aria-label={t('studio.editor.back')}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <h1 className="text-h1 text-on-surface">{t('studio.editor.heading.reflection')}</h1>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <label className="text-on-surface block text-sm font-medium">
            {t('studio.editor.lesson.titleLabel')}
            <Input
              className="mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label={t('studio.editor.lesson.titleLabel')}
            />
          </label>
          <label className="text-on-surface block text-sm font-medium">
            {t('studio.editor.reflection.promptLabel')}
            <Textarea
              className="mt-2 min-h-[320px] w-full"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              aria-label={t('studio.editor.reflection.promptLabel')}
            />
          </label>
          <div className="flex items-center gap-3">
            <Button variant="default" size="sm" onClick={() => void handleSave()} disabled={saving}>
              {t('studio.editor.save')}
            </Button>
            {saved ? (
              <span role="status" aria-live="polite" className="text-on-surface-variant text-sm">
                {t('studio.editor.saved')}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
          <EditorCoachingPanel
            checks={[
              {
                id: 'prompt',
                passed: hasPrompt,
                label: hasPrompt
                  ? t('studio.editor.coaching.reflection.promptPresent')
                  : t('studio.editor.coaching.reflection.promptMissing'),
              },
            ]}
            tips={[t('studio.editor.coaching.reflection.writePrompt')]}
          />
        </div>
      </div>
    </div>
  );
}
