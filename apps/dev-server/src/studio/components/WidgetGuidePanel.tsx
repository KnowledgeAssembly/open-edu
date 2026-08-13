import { MarkdownRenderer } from '@open-edu/runtime';
import { useTranslation } from '@open-edu/i18n';

export function WidgetGuidePanel({ markdown }: { markdown: string }) {
  const { t } = useTranslation();
  return (
    <details className="border-outline-variant bg-surface rounded-lg border">
      <summary className="text-on-surface cursor-pointer select-none px-4 py-3 text-sm font-medium">
        {t('studio.widget.guideTitle')}
      </summary>
      <div className="border-outline-variant border-t p-4">
        <MarkdownRenderer content={markdown} className="text-on-surface-variant text-sm" />
      </div>
    </details>
  );
}
