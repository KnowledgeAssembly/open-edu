export interface WidgetErrorFallbackProps {
  widgetId: string;
  message?: string;
  onRetry?: () => void;
  isDevMode?: boolean;
  devDetails?: string;
}

export function WidgetErrorFallback({
  widgetId: _widgetId,
  message = "This activity couldn't load. Try refreshing the page.",
  onRetry,
  isDevMode = false,
  devDetails,
}: WidgetErrorFallbackProps): JSX.Element {
  return (
    <div
      role="alert"
      className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      data-testid="widget-error-fallback"
    >
      <div className="mb-sm text-display-sm" aria-hidden="true">
        ⚠
      </div>
      <p className="text-on-surface mb-sm font-semibold">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-primary text-on-primary px-lg py-sm mt-sm text-body-ui rounded-lg font-semibold"
          data-testid="widget-retry-button"
        >
          Retry Activity
        </button>
      )}
      {isDevMode && devDetails && (
        <details className="mt-sm text-left">
          <summary className="text-on-surface-variant text-caption cursor-pointer">
            Technical details
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
