import { useCallback, useEffect, useState } from 'react';
import { Button, Badge, EmptyState } from '@open-edu/design-system';
import { ArrowDown, ArrowUp, Plus, Pencil } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { ActivitySummary, ActivityKind } from '../types.js';
import type { StudioApi } from '../studioApi.js';

function kindLabelKey(kind: ActivityKind): string {
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

function newLessonContent(): string {
  return '# New lesson\n\nStart writing here...\n';
}

function newQuizContent(): string {
  return JSON.stringify(
    {
      type: 'quiz',
      question: 'New question',
      options: [
        { id: 'a', text: 'First answer', correct: true },
        { id: 'b', text: 'Second answer', correct: false },
      ],
    },
    null,
    2,
  );
}

export function OutlineView({
  api,
  onEdit,
  onError,
  onTitleChange,
}: {
  api: StudioApi;
  onEdit: (path: string) => void;
  onError: (message: string) => void;
  onTitleChange?: (title: string) => void;
}) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const outline = await api.getOutline();
      setActivities(outline.activities);
      onTitleChange?.(outline.title);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [api, onError, onTitleChange, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persistOrder = async (next: ActivitySummary[]) => {
    setSaving(true);
    try {
      await api.saveOutlineOrder(next.map((a) => a.path));
      setActivities(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = [...activities];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    void persistOrder(next);
  };

  const addActivity = async (kind: 'lesson' | 'quiz') => {
    const stamp = Date.now();
    const path = kind === 'lesson' ? `nodes/lesson-${stamp}.md` : `nodes/quiz-${stamp}.json`;
    const content = kind === 'lesson' ? newLessonContent() : newQuizContent();
    try {
      await api.writeFile(path, content);
      const next = [
        ...activities,
        {
          id: path,
          path,
          title:
            kind === 'lesson'
              ? t('studio.outline.newLessonTitle')
              : t('studio.outline.newQuizTitle'),
          kind,
        },
      ];
      await persistOrder(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    }
  };

  if (loading && activities.length === 0) {
    return <p className="p-6 text-sm">…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-on-surface">{t('studio.outline.title')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void addActivity('lesson')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('studio.outline.addLesson')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void addActivity('quiz')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('studio.outline.addQuiz')}
          </Button>
        </div>
      </div>

      {activities.length === 0 ? (
        <EmptyState heading={t('studio.outline.empty')} description="" />
      ) : (
        <ul className="border-outline-variant bg-surface divide-outline-variant divide-y rounded-lg border">
          {activities.map((activity, index) => (
            <li key={activity.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-on-surface-variant w-6 text-right text-sm">{index + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="text-on-surface truncate text-sm font-medium">{activity.title}</p>
                <Badge variant="outline" className="text-on-surface-variant mt-1">
                  {t(kindLabelKey(activity.kind))}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('studio.outline.moveUp', { title: activity.title })}
                  disabled={index === 0 || saving}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('studio.outline.moveDown', { title: activity.title })}
                  disabled={index === activities.length - 1 || saving}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(activity.path)}>
                  <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t('studio.nav.editActivity')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
