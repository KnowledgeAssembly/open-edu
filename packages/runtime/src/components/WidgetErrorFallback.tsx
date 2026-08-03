import { Button } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';

export interface WidgetErrorFallbackProps {
  widgetId: string;
  message?: string;
  onRetry?: () => void;
  isDevMode?: boolean;
  devDetails?: string;
}

export function WidgetErrorFallback({
  widgetId: _widgetId,
  message,
  onRetry,
  isDevMode = false,
  devDetails,
}: WidgetErrorFallbackProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      data-testid="widget-error-fallback"
    >
      <div className="mb-sm text-display-lg" aria-hidden="true">
        ⚠
      </div>
      <p className="text-on-surface mb-sm font-semibold">
        {message || t('runtime.widget.loading_error')}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-sm" data-testid="widget-retry-button">
          {t('runtime.widget.retry')}
        </Button>
      )}
      {isDevMode && devDetails && (
        <details className="mt-sm text-left">
          <summary className="text-on-surface-variant text-caption cursor-pointer">
            {t('runtime.widget.technical_details')}
          </summary>
          <pre
            className="text-on-surface-variant mt-xs p-xs bg-surface-variant text-caption overflow-auto rounded"
            data-testid="widget-error-details"
          >
            {devDetails}
          </pre>
        </details>
      )}
    </div>
  );
}
