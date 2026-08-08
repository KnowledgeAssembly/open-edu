import { useEffect, useState } from 'react';
import { Button, Input, Textarea } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import type { StudioApi } from '../studioApi.js';
function syncHeading(content: string, title: string): string {
  const lines = content.split('\n');
  const firstHeading = lines.findIndex((line) => /^#{1,6}\s/.test(line));
  const heading = `# ${title}`;
  if (firstHeading === -1) {
    return `${heading}\n\n${content}`;
  }
  lines[firstHeading] = heading;
  return lines.join('\n');
}

export function LessonActivityEditor({
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
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .readFile(path)
      .then((file) => {
        if (cancelled) return;
        setBody(file.content);
        const match = file.content.match(/^#{1,6}\s+(.+)$/m);
        setTitle(match?.[1]?.trim() ?? '');
      })
      .catch((err) => {
        if (!cancelled) onError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, path, onError]);

  const handleTitleChange = (next: string) => {
    setTitle(next);
    setBody(syncHeading(body, next));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.writeFile(path, body);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const hasHeading = /^#{1,6}\s/m.test(body);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <label className="text-on-surface block text-sm font-medium">
        {t('studio.editor.lesson.titleLabel')}
        <Input
          className="mt-2"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          aria-label={t('studio.editor.lesson.titleLabel')}
        />
      </label>
      <label className="text-on-surface block text-sm font-medium">
        {t('studio.editor.lesson.bodyLabel')}
        <Textarea
          className="mt-2 min-h-[320px] font-mono"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label={t('studio.editor.lesson.bodyLabel')}
        />
      </label>
      {!hasHeading ? (
        <p className="text-error text-sm">{t('studio.ready.markdownHasHeading')}</p>
      ) : (
        <p className="text-on-surface-variant text-sm">{t('studio.editor.lesson.bodyHint')}</p>
      )}
      <div className="flex items-center gap-3">
        {onCancel ? (
          <Button variant="outline" size="sm" onClick={onCancel}>
            {t('studio.editor.cancel')}
          </Button>
        ) : null}
        <Button variant="default" size="sm" onClick={() => void handleSave()} disabled={saving}>
          {t('studio.editor.save')}
        </Button>
        {saved ? (
          <span className="text-on-surface-variant text-sm">{t('studio.editor.saved')}</span>
        ) : null}
      </div>
    </div>
  );
}
