import { useEffect, useState } from 'react';
import { Button, Textarea } from '@open-edu/design-system';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { StudioApi } from '../studioApi.js';

function looksLikeJson(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

export function RawActivityEditor({
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
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .readFile(path)
      .then((file) => {
        if (cancelled) return;
        setContent(file.content);
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
      await api.writeFile(path, content);
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
        <p className="text-on-surface-variant text-sm">{t('studio.editor.loading')}</p>
      </div>
    );
  }

  const invalidJson = looksLikeJson(content) && !isValidJson(content);
  const fileName = path.split('/').pop() || path;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-outline-variant bg-surface flex items-center gap-2 border-b px-4 py-2">
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel} aria-label={t('studio.editor.back')}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <h1 className="text-h1 text-on-surface">{t('studio.editor.raw.title')}</h1>
        <span className="text-on-surface-variant truncate text-sm">{fileName}</span>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <label className="text-on-surface block text-sm font-medium">
          {t('studio.editor.raw.contentLabel')}
          <Textarea
            className="mt-2 min-h-[320px] w-full font-mono"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label={t('studio.editor.raw.contentLabel')}
          />
        </label>
        {invalidJson ? (
          <p role="alert" className="text-error text-sm">
            {t('studio.editor.raw.invalidJson')}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || invalidJson}
          >
            {t('studio.editor.save')}
          </Button>
          {saved ? (
            <span role="status" aria-live="polite" className="text-on-surface-variant text-sm">
              {t('studio.editor.saved')}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isValidJson(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}
