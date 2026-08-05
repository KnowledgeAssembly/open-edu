import { useCallback, useEffect, useState } from 'react';
import { Button } from '@open-edu/design-system';
import { Check, X } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { buildReadyCheck, isReadyToExport } from '../readyCheck.js';
import type { ReadyCheckItem } from '../types.js';
import type { StudioApi } from '../studioApi.js';

export function ShareView({
  api,
  onError,
}: {
  api: StudioApi;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ReadyCheckItem[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const runReadyCheck = useCallback(async () => {
    try {
      const [outline, validation] = await Promise.all([api.getOutline(), api.validate()]);
      const files = new Map<string, string>();
      const fileRequests = outline.activities.map(async (activity) => {
        try {
          const file = await api.readFile(activity.path);
          files.set(activity.path, file.content);
        } catch {
          // unreadable node counts as missing content
        }
      });
      await Promise.all(fileRequests);
      const checkItems = buildReadyCheck({
        title: outline.title,
        files,
        validationErrors: validation.errors,
      });
      setItems(checkItems);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    }
  }, [api, onError, t]);

  useEffect(() => {
    void runReadyCheck();
  }, [runReadyCheck]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await api.exportOep();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    const steps = [
      t('studio.share.howTo.step1'),
      t('studio.share.howTo.step2'),
      t('studio.share.howTo.step3'),
      t('studio.share.howTo.step4'),
    ];
    try {
      await navigator.clipboard.writeText(steps.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const ready = items ? isReadyToExport(items) : false;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-h1 text-on-surface">{t('studio.share.title')}</h1>
        <p className="text-on-surface-variant mt-2">{t('studio.share.lede')}</p>
      </div>

      <section aria-labelledby="studio-ready-heading">
        <h2 id="studio-ready-heading" className="text-h2 text-on-surface mb-4">
          {t('studio.share.readyHeading')}
        </h2>
        {items === null ? (
          <p className="text-on-surface-variant text-sm">…</p>
        ) : (
          <ul className="border-outline-variant bg-surface divide-outline-variant divide-y rounded-lg border">
            {items.map((item) => (
              <li
                key={item.id}
                className="text-on-surface flex items-center gap-3 px-4 py-3 text-sm"
              >
                {item.passed ? (
                  <Check className="text-success h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <X className="text-error h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span className="flex-1">{t(item.labelKey)}</span>
                {item.detail ? (
                  <span className="text-on-surface-variant max-w-[40%] truncate text-xs">
                    {item.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-3">
        <Button variant="default" size="sm" disabled={!ready || exporting} onClick={() => void handleExport()}>
          {exporting ? t('studio.share.exporting') : t('studio.share.exportOep')}
        </Button>
      </div>

      <section aria-labelledby="studio-howto-heading">
        <h2 id="studio-howto-heading" className="text-h2 text-on-surface mb-4">
          {t('studio.share.howToHeading')}
        </h2>
        <ol className="border-outline-variant bg-surface space-y-2 rounded-lg border p-4">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="text-on-surface-variant text-sm">
              {n}. {t(`studio.share.howTo.step${n}`)}
            </li>
          ))}
        </ol>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void handleCopy()}>
          {copied ? t('studio.share.copied') : t('studio.share.copyInstructions')}
        </Button>
      </section>
    </div>
  );
}
