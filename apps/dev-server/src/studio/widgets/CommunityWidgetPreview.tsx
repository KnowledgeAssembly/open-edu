import { useEffect, useState } from 'react';
import type { WidgetPolicy } from '@open-edu/schemas';
import {
  createWidgetResolver,
  createWidgetArtifactCache,
  createDefaultRegistry,
  type WidgetResolver,
  type ResolverCatalog,
  type ResolvedWidget,
} from '@open-edu/widgets';
import {
  SandboxWidgetAdapter,
  type SandboxWidgetAdapterProps,
} from '@open-edu/runtime';
import { PROTOCOL_API_VERSION } from '@open-edu/widget-sdk';
import type { CompletePayload, StateSavePayload } from '@open-edu/widget-sdk';
import type { CuratedWidget } from './curatedCatalog';
import { toExportedWidgetRef } from './widgetRefExport';

export interface CommunityWidgetPreviewProps {
  widget: CuratedWidget;
  config?: Record<string, unknown>;
  policy: WidgetPolicy;
  catalogs: Record<string, ResolverCatalog>;
  resolver?: WidgetResolver;
  onDiagnostic?: (code: string) => void;
  onComplete?: (payload: CompletePayload) => void;
  onStateSave?: (payload: StateSavePayload) => void;
}

export function CommunityWidgetPreview(props: CommunityWidgetPreviewProps): JSX.Element {
  const { widget, config, policy, catalogs, resolver, onDiagnostic, onComplete, onStateSave } =
    props;
  const [resolved, setResolved] = useState<ResolvedWidget | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ref;
    try {
      ref = toExportedWidgetRef(widget);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    const activeResolver =
      resolver ??
      createWidgetResolver({
        policy,
        cache: createWidgetArtifactCache(),
        catalogs,
        registry: createDefaultRegistry(),
        now: Date.now,
      });
    setResolved(undefined);
    setError(null);
    void activeResolver
      .resolve(ref, config)
      .then((r) => {
        if (!cancelled) setResolved(r);
      })
      .catch(() => {
        if (!cancelled) setError('resolve-error');
      });
    return () => {
      cancelled = true;
    };
  }, [resolver, policy, catalogs, widget, config]);

  if (error) {
    return (
      <div role="alert" data-testid="community-preview-error">
        {error}
      </div>
    );
  }

  if (!resolved) {
    return (
      <div role="region" data-testid="community-preview-resolving" aria-live="polite" />
    );
  }

  if (resolved.ok && resolved.tier === 'native') {
    return (
      <div role="note" data-testid="community-preview-native" />
    );
  }

  if (resolved.ok && resolved.tier === 'sandboxed') {
    const initPayload: SandboxWidgetAdapterProps['initPayload'] = {
      apiVersion: PROTOCOL_API_VERSION,
      widgetId: widget.id,
      widgetVersion: widget.version,
      instanceId: '',
      nodeId: 'preview',
      config: config ?? {},
      locale: 'en',
      theme: 'light',
      themeTokens: {},
      prefersReducedMotion: false,
      capabilities: ['observe-mode'],
    };
    const expectedOrigin: string | 'opaque' = resolved.srcDoc
      ? 'opaque'
      : resolved.documentUrl
        ? new URL(resolved.documentUrl).origin
        : 'opaque';
    return (
      <SandboxWidgetAdapter
        nodeId="preview"
        documentUrl={resolved.documentUrl}
        srcDoc={resolved.srcDoc}
        expectedOrigin={expectedOrigin}
        title={widget.id}
        initPayload={initPayload}
        onReady={() => {}}
        onComplete={(payload) => onComplete?.(payload)}
        onStateSave={(payload) => onStateSave?.(payload)}
        onInteraction={() => {}}
        onError={(message) => setError(message)}
        onDiagnostic={(reason) => onDiagnostic?.(reason)}
      />
    );
  }

  return (
    <div role="alert" data-testid="community-preview-error">
      {resolved.message}
    </div>
  );
}
