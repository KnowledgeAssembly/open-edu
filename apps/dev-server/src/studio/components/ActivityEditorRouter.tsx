import { useEffect, useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { LessonActivityEditor } from './LessonActivityEditor.js';
import { QuizActivityEditor } from './QuizActivityEditor.js';
import { PracticeActivityEditor } from './PracticeActivityEditor.js';
import { detectActivityKind } from '../outlineModel.js';
import type { ActivityKind } from '../types.js';
import type { StudioApi } from '../studioApi.js';

export function ActivityEditorRouter({
  api,
  path,
  onSaved,
  onError,
}: {
  api: StudioApi;
  path: string;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ActivityKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .readFile(path)
      .then((file) => {
        if (!cancelled) setKind(detectActivityKind(file.path, file.content));
      })
      .catch((err) => {
        if (!cancelled) onError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, path, onError]);

  if (kind === null) return <p className="p-6 text-sm">…</p>;

  if (kind === 'lesson') {
    return <LessonActivityEditor api={api} path={path} onSaved={onSaved} onError={onError} />;
  }

  if (kind === 'quiz') {
    return <QuizActivityEditor api={api} path={path} onSaved={onSaved} onError={onError} />;
  }

  if (kind === 'practice') {
    return <PracticeActivityEditor api={api} path={path} onSaved={onSaved} onError={onError} />;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <p className="text-on-surface-variant text-sm">
        {t('studio.editor.advanced.requiresDeveloper')}
      </p>
    </div>
  );
}
