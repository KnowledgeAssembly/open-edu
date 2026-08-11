import { Button, cn } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { STUDIO_TEMPLATES } from '../templates/catalog.js';

export function HomeTemplateGallery({
  selectedId,
  onSelect,
  onApply,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onApply: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="studio-templates-heading">
      <h2 id="studio-templates-heading" className="text-h2 text-on-surface mb-4">
        {t('studio.home.templatesHeading')}
      </h2>
      <p className="text-on-surface-variant mb-4 text-sm">{t('studio.home.templatesHint')}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {STUDIO_TEMPLATES.map((template) => {
          const selected = selectedId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : template.id)}
              className={cn(
                'studio-select-settle border text-left',
                selected
                  ? 'border-primary bg-primary/5 shadow-raised'
                  : 'border-outline-variant bg-surface',
                'rounded-lg px-6 py-5',
              )}
            >
              <h3 className="text-on-surface text-sm font-semibold">{t(template.titleKey)}</h3>
              <p className="text-on-surface-variant mt-1 text-sm">{t(template.descriptionKey)}</p>
            </button>
          );
        })}
      </div>
      <Button
        variant="default"
        size="sm"
        className="mt-4"
        disabled={!selectedId}
        onClick={() => selectedId && onApply(selectedId)}
      >
        {t('studio.home.useTemplate')}
      </Button>
    </section>
  );
}
