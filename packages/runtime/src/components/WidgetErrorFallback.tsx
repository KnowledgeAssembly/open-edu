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
      <div className="mb-sm text-3xl" aria-hidden="true">
        ⚠
      </div>
      <p className="text-on-surface mb-sm font-semibold">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-primary text-on-primary px-lg py-sm mt-sm rounded-lg text-sm font-semibold"
          data-testid="widget-retry-button"
        >
          Retry Activity
        </button>
      )}
      {isDevMode && devDetails && (
        <details className="mt-sm text-left">
          <summary className="text-on-surface-variant cursor-pointer text-xs">
            Technical details
          </summary>
          <pre
            className="text-on-surface-variant mt-xs p-xs bg-surface-variant overflow-auto rounded text-xs"
            data-testid="widget-error-details"
          >
            {devDetails}
          </pre>
        </details>
      )}
    </div>
  );
}
