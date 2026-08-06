import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, Input } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import type { StudioApi } from '../studioApi.js';
import type { LibraryEntry } from '../library/types.js';

export function UnitBuilderView({
  api,
  onCreated,
  onError,
}: {
  api: StudioApi;
  onCreated: (entry: LibraryEntry) => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      const result = await api.getLibrary();
      setCourses(result.entries.filter((entry) => entry.kind === 'course'));
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [api, onError, t]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const toggleCourse = useCallback((relativePath: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(relativePath)) {
        next.delete(relativePath);
      } else {
        next.add(relativePath);
      }
      return next;
    });
  }, []);

  const selectedPaths = useMemo(() => Array.from(selected), [selected]);
  const count = selectedPaths.length;
  const tooFew = count > 0 && count < 2;
  const tooMany = count > 5;
  const canCreate = name.trim().length > 0 && count >= 2 && count <= 5;

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const result = await api.createUnit(name.trim(), selectedPaths);
      onCreated(result.entry);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="text-on-surface-variant p-6 text-sm">…</p>;
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <div>
          <h1 className="text-h1 text-on-surface">{t('studio.unit.title')}</h1>
          <p className="text-on-surface-variant mt-2">{t('studio.unit.lede')}</p>
        </div>
        <EmptyState heading={t('studio.unit.emptyCourses')} description="" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-h1 text-on-surface">{t('studio.unit.title')}</h1>
        <p className="text-on-surface-variant mt-2">{t('studio.unit.lede')}</p>
      </div>

      <section aria-labelledby="studio-unit-name-heading">
        <h2 id="studio-unit-name-heading" className="sr-only">
          {t('studio.unit.nameLabel')}
        </h2>
        <Input
          aria-label={t('studio.unit.nameLabel')}
          placeholder={t('studio.unit.nameLabel')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </section>

      <section aria-labelledby="studio-unit-pick-heading">
        <h2 id="studio-unit-pick-heading" className="text-h2 text-on-surface mb-4">
          {t('studio.unit.pickCourses')}
        </h2>
        <ul className="space-y-2">
          {courses.map((course) => (
            <li key={course.relativePath}>
              <label className="border-outline-variant bg-surface flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={course.title}
                  checked={selected.has(course.relativePath)}
                  onChange={() => toggleCourse(course.relativePath)}
                  className="accent-primary h-4 w-4"
                />
                <span className="text-on-surface flex-1 text-sm font-medium">{course.title}</span>
                <Badge variant="secondary">{t('studio.library.kind.course')}</Badge>
              </label>
            </li>
          ))}
        </ul>
        {tooFew ? (
          <p className="text-on-surface-variant mt-3 text-sm">{t('studio.unit.needTwo')}</p>
        ) : null}
        {tooMany ? <p className="text-error mt-3 text-sm">{t('studio.unit.needMax')}</p> : null}
      </section>

      <div className="flex items-center gap-3">
        <Button
          variant="default"
          size="sm"
          disabled={!canCreate || creating}
          onClick={() => void handleCreate()}
        >
          {creating ? t('studio.unit.creating') : t('studio.unit.create')}
        </Button>
      </div>
    </div>
  );
}
