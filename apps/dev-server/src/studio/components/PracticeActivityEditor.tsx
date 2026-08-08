import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
} from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { ExerciseNodeSchema } from '@open-edu/schemas';
import { SchemaForm } from '../../editor/SchemaForm.js';
import { WidgetPreviewPanel } from '../../editor/WidgetPreviewPanel.js';
import { validateWidgetConfigForType } from '../../editor/WidgetValidator.js';
import type { ValidationError } from '../../editor/WidgetValidator.js';
import { parseExerciseNode, serializeExerciseNode } from '../widgets/exerciseNode.js';
import type { ExerciseNode } from '../widgets/exerciseNode.js';
import { getCuratedWidget } from '../widgets/curatedCatalog.js';
import type { CuratedWidget } from '../widgets/curatedCatalog.js';
import { WidgetPicker } from './WidgetPicker.js';
import { WidgetGuidePanel } from './WidgetGuidePanel.js';
import type { StudioApi } from '../studioApi.js';

function titleCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function topLevelKey(fieldName: string): string {
  return (fieldName.split('.')[0] ?? '').split('[')[0] ?? '';
}

function defaultForType(type: string): unknown {
  if (type === 'boolean') return false;
  if (type === 'number') return 0;
  if (type.startsWith('array')) return [];
  return '';
}

function seedConfigFor(widget: CuratedWidget): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const field of widget.guide?.configFields ?? []) {
    const key = topLevelKey(field.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    config[key] = defaultForType(field.type);
  }
  return config;
}

export function PracticeActivityEditor({
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
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notPractice, setNotPractice] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotPractice(false);
    api
      .readFile(path)
      .then((file) => {
        if (cancelled) return;
        const node = parseExerciseNode(file.content);
        if (!node) {
          setNotPractice(true);
          setLoading(false);
          return;
        }
        const curated = getCuratedWidget(node.widget);
        setTitle(node.title ?? '');
        setWidgetId(node.widget);
        setConfig(
          curated && Object.keys(node.config ?? {}).length === 0
            ? seedConfigFor(curated)
            : node.config,
        );
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) onError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, path, onError]);

  const curated = widgetId ? getCuratedWidget(widgetId) : undefined;

  const validationErrors = useMemo<ValidationError[]>(
    () => (curated && widgetId ? validateWidgetConfigForType(widgetId, config) : []),
    [curated, widgetId, config],
  );

  const fieldErrors = useMemo(() => {
    const map: Record<string, ValidationError[]> = {};
    for (const err of validationErrors) {
      const key = topLevelKey(err.path);
      if (!key) continue;
      (map[key] ??= []).push(err);
    }
    return map;
  }, [validationErrors]);

  const fieldLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const field of curated?.guide?.configFields ?? []) {
      const key = topLevelKey(field.name);
      if (!key || labels[key]) continue;
      labels[key] = titleCase(key);
    }
    return labels;
  }, [curated]);

  const nodeJsonValid = useMemo(() => {
    const result = ExerciseNodeSchema.safeParse({
      type: 'exercise',
      title: title || undefined,
      widget: widgetId ?? '',
      config,
    });
    return result.success;
  }, [title, widgetId, config]);

  const handleSave = async () => {
    if (!widgetId) return;
    setSaving(true);
    try {
      const node: ExerciseNode = {
        type: 'exercise',
        title: title || undefined,
        widget: widgetId,
        config,
      };
      await api.writeFile(path, serializeExerciseNode(node));
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-sm">…</p>;

  if (notPractice) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          heading={t('studio.practice.notPracticeNode')}
          description={t('studio.practice.notPracticeLede')}
        />
      </div>
    );
  }

  if (!widgetId || !curated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <EmptyState
          heading={t('studio.practice.unknownWidget')}
          description={t('studio.practice.unknownWidgetLede')}
        />
        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
          {t('studio.practice.chooseAnother')}
        </Button>
        <WidgetPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(widget) => {
            setWidgetId(widget.id);
            setConfig(seedConfigFor(widget));
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="text-on-surface block text-sm font-medium">
            {t('studio.editor.lesson.titleLabel')}
            <Input
              className="mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label={t('studio.editor.lesson.titleLabel')}
            />
          </label>
          <Card className="border-outline-variant bg-surface">
            <CardHeader>
              <CardTitle className="text-h3 text-on-surface">
                {t('studio.widget.configTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SchemaForm
                data={config}
                onChange={setConfig}
                fieldLabels={fieldLabels}
                fieldErrors={fieldErrors}
              />
            </CardContent>
          </Card>
          {validationErrors.length > 0 ? (
            <div
              role="alert"
              className="border-error-container bg-error-container rounded-lg border p-4"
            >
              <p className="text-error text-sm font-medium">{t('studio.widget.validationFix')}</p>
              <p className="text-error mt-1 text-sm">{t('studio.practice.validationSummary')}</p>
              {validationErrors[0] ? (
                <p className="text-error/70 mt-1 text-xs">
                  {validationErrors[0].path}: {validationErrors[0].message}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            {onCancel ? (
              <Button variant="outline" size="sm" onClick={onCancel}>
                {t('studio.editor.cancel')}
              </Button>
            ) : null}
            <Button
              variant="default"
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !nodeJsonValid}
            >
              {t('studio.editor.save')}
            </Button>
            {!nodeJsonValid ? (
              <span className="text-error text-sm">{t('studio.widget.validationFix')}</span>
            ) : null}
            {saved ? (
              <span className="text-on-surface-variant text-sm">{t('studio.editor.saved')}</span>
            ) : null}
          </div>
        </div>
        <Card className="border-outline-variant bg-surface">
          <CardHeader>
            <CardTitle className="text-h3 text-on-surface">
              {t('studio.widget.previewTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RuntimeThemeProvider>
              <WidgetPreviewPanel
                widgetType={widgetId}
                widgetConfig={config}
                validationErrors={validationErrors}
              />
            </RuntimeThemeProvider>
          </CardContent>
        </Card>
      </div>
      {curated?.guideMarkdown ? <WidgetGuidePanel markdown={curated.guideMarkdown} /> : null}
    </div>
  );
}
