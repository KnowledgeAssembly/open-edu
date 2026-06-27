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
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-center"
      data-testid="widget-error-fallback"
    >
      <div className="text-3xl mb-sm" aria-hidden="true">
        ⚠
      </div>
      <p className="text-on-surface font-semibold mb-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold text-sm mt-sm"
          data-testid="widget-retry-button"
        >
          Retry Activity
        </button>
      )}
      {isDevMode && devDetails && (
        <details className="mt-sm text-left">
          <summary className="text-xs text-on-surface-variant cursor-pointer">
            Technical details
          </summary>
          <pre
            className="text-xs text-on-surface-variant mt-xs p-xs bg-surface-variant rounded overflow-auto"
            data-testid="widget-error-details"
          >
            {devDetails}
          </pre>
        </details>
      )}
    </div>
  );
}
