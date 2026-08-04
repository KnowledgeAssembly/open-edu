import { useCallback, useRef } from 'react';
import type { ValidationError } from './WidgetValidator';
import { WidgetPreviewProvider, useWidgetPreview } from './WidgetPreviewProvider';
import type { WidgetRenderProps } from '@open-edu/widgets';
import { Badge, Button, EmptyState } from '@open-edu/design-system';
import { OasAnimationWrapper } from '@open-edu/runtime';
import type { OasAnimationController } from '@open-edu/runtime';
import { PanelRightClose, RotateCcw } from 'lucide-react';

interface WidgetPreviewPanelProps {
  widgetType: string | null;
  widgetConfig: Record<string, unknown> | null;
  validationErrors: ValidationError[];
  onCollapse?: () => void;
  collapsed?: boolean;
}

function WidgetPreviewRenderer({
  widgetType,
  widgetConfig,
}: {
  widgetType: string;
  widgetConfig: Record<string, unknown>;
}) {
  const { registry, emitInteraction, complete, storedState } = useWidgetPreview();
  const definition = registry.get(widgetType);
  const animationControllerRef = useRef<OasAnimationController | null>(null);

  const resolveAsset = useCallback((path: string): string => {
    const normalized = (path ?? '')
      .replace(/^\//, '')
      .replace(/^(?:\.\.?\/)*/, '')
      .replace(/^assets\//, '');
    if (!normalized) return '';
    return `/assets/${normalized}`;
  }, []);

  const handleInteraction = useCallback(
    (data: Record<string, unknown>) => {
      emitInteraction(widgetType, data);
      if (data.action === 'reveal') {
        animationControllerRef.current?.nextStep();
      }
    },
    [widgetType, emitInteraction],
  );

  if (!definition) {
    const available = registry
      .getAll()
      .map((w) => w.id)
      .join(', ');
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <p className="text-on-surface-variant text-sm font-medium">
            Widget '{widgetType}' not found
          </p>
          <p className="text-on-surface-variant/60 mt-1 text-xs">Available: {available}</p>
        </div>
      </div>
    );
  }

  const WidgetComponent = definition.render;
  const widgetProps: WidgetRenderProps = {
    nodeId: '__preview__',
    config: widgetConfig,
    emitInteraction: handleInteraction,
    complete: (score?: number, state?: unknown) => complete(score, state),
    storedState,
  };

  const animationConfig = widgetConfig?.animation;

  const widgetElement = <WidgetComponent {...widgetProps} />;

  return (
    <div className="flex min-h-[200px] items-center justify-center p-4">
      <div className="w-full max-w-[600px]">
        {animationConfig ? (
          <OasAnimationWrapper
            config={animationConfig}
            resolveSrc={resolveAsset}
            preserveChildren
            controllerRef={animationControllerRef}
            staticChildren={widgetElement}
          />
        ) : (
          widgetElement
        )}
      </div>
    </div>
  );
}

export function WidgetPreviewPanel({
  widgetType,
  widgetConfig,
  validationErrors,
  onCollapse,
  collapsed,
}: WidgetPreviewPanelProps): JSX.Element {
  const errorCount = validationErrors.filter((e) => e.severity === 'error').length;
  const warningCount = validationErrors.filter((e) => e.severity === 'warning').length;

  return (
    <div className="flex h-full flex-col" data-testid="widget-preview-panel">
      {/* Header */}
      <div className="border-outline-variant bg-surface-container flex shrink-0 items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant text-xs font-semibold">Preview</span>
          {widgetType && (
            <Badge variant="outline" className="text-[10px]">
              {widgetType}
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount > 0 && errorCount === 0 && (
            <span className="text-warning text-[10px] font-medium">
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {widgetType && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Reset preview"
              aria-label="Reset preview"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          {onCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onCollapse}
              title={collapsed ? 'Show preview' : 'Hide preview'}
              aria-label={collapsed ? 'Show preview' : 'Hide preview'}
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Validation banner */}
      {validationErrors.length > 0 && (
        <div
          className="border-error-container bg-error-container shrink-0 border-b px-3 py-2"
          role="alert"
        >
          {validationErrors.slice(0, 3).map((err, i) => (
            <p key={i} className="text-error text-[11px] leading-relaxed">
              <span className="font-medium">{err.path}</span>: {err.message}
            </p>
          ))}
          {validationErrors.length > 3 && (
            <p className="text-error/70 mt-1 text-[11px]">
              ...and {validationErrors.length - 3} more
            </p>
          )}
        </div>
      )}

      {/* Preview body */}
      <div className="flex-1 overflow-auto">
        {!widgetType ? (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              heading="No widget to preview"
              description="Select an exercise or custom node to see a live preview"
            />
          </div>
        ) : (
          <WidgetPreviewProvider>
            <WidgetPreviewRenderer widgetType={widgetType} widgetConfig={widgetConfig ?? {}} />
          </WidgetPreviewProvider>
        )}
      </div>
    </div>
  );
}
