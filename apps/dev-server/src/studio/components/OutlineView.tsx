import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Badge,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
import { ArrowDown, ArrowUp, Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { createEmptyExercise, serializeExerciseNode } from '../widgets/exerciseNode.js';
import type { CuratedWidget } from '../widgets/curatedCatalog.js';
import { WidgetPicker } from './WidgetPicker.js';
import { FlowAdvancedPanel } from './FlowAdvancedPanel.js';
import { RewardsCardsPanel } from './RewardsCardsPanel.js';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ActivitySummary | null>(null);

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

  const addPractice = async (widget: CuratedWidget) => {
    const stamp = Date.now();
    const path = `nodes/practice-${stamp}.json`;
    const content = serializeExerciseNode(
      createEmptyExercise(widget.id, t('studio.outline.newPracticeTitle')),
    );
    try {
      await api.writeFile(path, content);
      const next: ActivitySummary[] = [
        ...activities,
        { id: path, path, title: widget.name, kind: 'practice' },
      ];
      await persistOrder(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    }
  };

  const removeActivity = async (activity: ActivitySummary) => {
    setSaving(true);
    try {
      await api.deleteFile(activity.path);
      const remaining = activities.filter((a) => a.id !== activity.id);
      setActivities(remaining);
      await api.saveOutlineOrder(remaining.map((a) => a.path));
      setDeleteTarget(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setSaving(false);
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
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('studio.outline.addPractice')}
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
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('studio.outline.delete', { title: activity.title })}
                  disabled={saving}
                  onClick={() => setDeleteTarget(activity)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <WidgetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(widget) => void addPractice(widget)}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('studio.outline.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('studio.outline.deleteConfirmLede', { title: deleteTarget?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              {t('studio.outline.deleteCancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTarget && void removeActivity(deleteTarget)}
              disabled={saving}
            >
              {t('studio.outline.deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <details className="border-outline-variant bg-surface rounded-lg border" open={false}>
          <summary className="text-on-surface cursor-pointer select-none px-4 py-3 text-sm font-medium">
            {t('studio.flow.title')}
          </summary>
          <div className="border-outline-variant border-t px-4 py-4">
            <FlowAdvancedPanel api={api} onError={onError} />
          </div>
        </details>
        <details className="border-outline-variant bg-surface rounded-lg border" open={false}>
          <summary className="text-on-surface cursor-pointer select-none px-4 py-3 text-sm font-medium">
            {t('studio.rewards.title')}
          </summary>
          <div className="border-outline-variant border-t px-4 py-4">
            <RewardsCardsPanel api={api} onError={onError} />
          </div>
        </details>
      </div>
    </div>
  );
}
