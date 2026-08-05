import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-edu/design-system';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { Workflow } from '@open-edu/schemas';
import type { StudioApi } from '../studioApi.js';
import type { ActivitySummary } from '../types.js';
import { buildLinearWorkflow } from '../outlineModel.js';
import {
  applyScoreBranch,
  clearScoreBranch,
  extractScoreBranches,
  outlineSuccessor,
  type ScoreBranchRule,
} from '../flow/branchModel.js';

const COMPLETED = 'COMPLETED';

function hasUnrecognizedRoutes(workflow: Workflow, orderedPaths: string[]): boolean {
  const managed = new Set(extractScoreBranches(workflow).map((branch) => branch.afterPath));
  for (const [key, route] of Object.entries(workflow.routing)) {
    if ('conditions' in route) {
      if (!managed.has(key)) return true;
    } else if (route.onComplete !== COMPLETED && !orderedPaths.includes(route.onComplete)) {
      return true;
    }
  }
  return false;
}

function ActivityTargetSelect({
  value,
  onChange,
  activities,
  label,
  allowEndCourse,
}: {
  value: string;
  onChange: (value: string) => void;
  activities: ActivitySummary[];
  label: string;
  allowEndCourse: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-2 w-full" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {activities.map((activity) => (
          <SelectItem key={activity.path} value={activity.path}>
            {activity.title}
          </SelectItem>
        ))}
        {allowEndCourse ? (
          <SelectItem value={COMPLETED}>{t('studio.flow.endCourse')}</SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}

export function FlowAdvancedPanel({
  api,
  onError,
}: {
  api: StudioApi;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [orderedPaths, setOrderedPaths] = useState<string[]>([]);
  const [loadedWorkflow, setLoadedWorkflow] = useState<Workflow | null>(null);
  const [branches, setBranches] = useState<ScoreBranchRule[]>([]);
  const [unrecognized, setUnrecognized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const outline = await api.getOutline();
        if (cancelled) return;
        const paths = outline.activities.map((activity) => activity.path);
        setActivities(outline.activities);
        setOrderedPaths(paths);

        let workflow: Workflow | null = null;
        try {
          const file = await api.readFile('workflow.json');
          const parsed = JSON.parse(file.content) as Workflow;
          if (parsed && typeof parsed.routing === 'object' && parsed.routing) {
            workflow = parsed;
          }
        } catch {
          workflow = null;
        }
        if (cancelled) return;
        setLoadedWorkflow(workflow);
        if (workflow) {
          setBranches(extractScoreBranches(workflow));
          setUnrecognized(hasUnrecognizedRoutes(workflow, paths));
        }
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, onError]);

  const addBranch = () => {
    setBranches((prev) => [
      ...prev,
      {
        afterPath: orderedPaths[0] ?? '',
        minScore: 80,
        passPath: orderedPaths[1] ?? COMPLETED,
        failPath: COMPLETED,
      },
    ]);
  };

  const updateBranch = (index: number, patch: Partial<ScoreBranchRule>) => {
    setBranches((prev) =>
      prev.map((branch, i) => (i === index ? { ...branch, ...patch } : branch)),
    );
  };

  const removeBranch = (index: number) => {
    setBranches((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const base: Workflow = loadedWorkflow ?? {
        routing: buildLinearWorkflow(orderedPaths, orderedPaths[0] ?? '').routing,
      };
      let final = base;
      for (const branch of branches) {
        final = applyScoreBranch(final, branch);
      }
      const previouslyManaged = new Set(
        extractScoreBranches(base).map((branch) => branch.afterPath),
      );
      for (const afterPath of previouslyManaged) {
        if (!branches.some((branch) => branch.afterPath === afterPath)) {
          final = clearScoreBranch(final, afterPath, outlineSuccessor(orderedPaths, afterPath));
        }
      }
      await api.writeFile('workflow.json', JSON.stringify(final, null, 2));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-sm">…</p>;

  if (activities.length === 0) {
    return <EmptyState heading={t('studio.flow.title')} description={t('studio.flow.empty')} />;
  }

  return (
    <Card className="border-outline-variant">
      <CardHeader>
        <CardTitle>{t('studio.flow.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {unrecognized ? (
          <p className="text-on-surface-variant text-sm">{t('studio.flow.advancedPreserved')}</p>
        ) : null}
        {branches.length === 0 ? (
          <p className="text-on-surface-variant text-sm">{t('studio.flow.linearHelp')}</p>
        ) : (
          <ul className="space-y-3">
            {branches.map((branch, index) => (
              <li
                key={index}
                className="border-outline-variant bg-surface space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-on-surface text-sm font-medium">
                    {t('studio.flow.afterActivity')}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeBranch(index)}>
                    <X className="mr-1 size-4" aria-hidden="true" />
                    {t('studio.flow.removeBranch')}
                  </Button>
                </div>
                <ActivityTargetSelect
                  value={branch.afterPath}
                  onChange={(value) => updateBranch(index, { afterPath: value })}
                  activities={activities}
                  label={t('studio.flow.afterActivity')}
                  allowEndCourse={false}
                />
                <label className="text-on-surface block text-sm font-medium">
                  {t('studio.flow.ifScoreAtLeast')}
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={branch.minScore}
                    onChange={(e) => updateBranch(index, { minScore: Number(e.target.value) })}
                    className="mt-2"
                    aria-label={t('studio.flow.ifScoreAtLeast')}
                  />
                </label>
                <span className="text-on-surface block text-sm font-medium">
                  {t('studio.flow.thenGoTo')}
                  <ActivityTargetSelect
                    value={branch.passPath}
                    onChange={(value) => updateBranch(index, { passPath: value })}
                    activities={activities}
                    label={t('studio.flow.thenGoTo')}
                    allowEndCourse
                  />
                </span>
                <span className="text-on-surface block text-sm font-medium">
                  {t('studio.flow.otherwiseGoTo')}
                  <ActivityTargetSelect
                    value={branch.failPath}
                    onChange={(value) => updateBranch(index, { failPath: value })}
                    activities={activities}
                    label={t('studio.flow.otherwiseGoTo')}
                    allowEndCourse
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-on-surface-variant text-sm">{t('studio.flow.scorePercentHint')}</p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={addBranch}>
            <Plus className="mr-1 size-4" aria-hidden="true" />
            {t('studio.flow.addBranch')}
          </Button>
          <Button variant="default" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {t('studio.editor.save')}
          </Button>
          {saved ? (
            <span className="text-on-surface-variant text-sm">{t('studio.editor.saved')}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
