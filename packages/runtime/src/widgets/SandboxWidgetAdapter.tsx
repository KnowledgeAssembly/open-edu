import { useEffect, useRef, useState } from 'react';
import {
  PROTOCOL_API_VERSION,
  validateHostBoundMessage,
  type InitPayload,
  type CompletePayload,
  type StateSavePayload,
  type InteractionPayload,
  type HostSession,
} from '@open-edu/widget-sdk';
import {
  READY_TIMEOUT_MS,
  MAX_STATE_BYTES,
  clampResizeHeight,
  createRateLimiter,
} from './sandbox-limits';

export interface SandboxWidgetAdapterProps {
  nodeId: string;
  documentUrl?: string;
  srcDoc?: string;
  expectedOrigin: string | 'opaque';
  title: string;
  initPayload: InitPayload;
  onReady: () => void;
  onComplete: (payload: CompletePayload) => void;
  onStateSave: (payload: StateSavePayload) => void;
  onInteraction: (payload: InteractionPayload) => void;
  onError: (message: string) => void;
  onDiagnostic?: (reason: string) => void;
}

function createInstanceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'sandbox-' + Math.random().toString(36).slice(2);
}

export { isSandboxWidgetsEnabled } from './sandbox-limits';

export let activeFrames = 0;

export function SandboxWidgetAdapter(props: SandboxWidgetAdapterProps): JSX.Element | null {
  const {
    documentUrl,
    srcDoc,
    expectedOrigin,
    title,
    initPayload,
    onReady,
    onComplete,
    onStateSave,
    onInteraction,
    onError,
    onDiagnostic,
  } = props;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const cancelledRef = useRef(false);
  const hostSequenceRef = useRef(1);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateIncompatibleRef = useRef(false);

  const sessionRef = useRef<HostSession>({
    instanceId: createInstanceId(),
    nonce: createInstanceId(),
    expectedOrigin,
    lastSequence: 0,
  });

  const rateLimiterRef = useRef(createRateLimiter());
  const [errored, setErrored] = useState(false);

  const callbacksRef = useRef({
    onReady,
    onComplete,
    onStateSave,
    onInteraction,
    onError,
    onDiagnostic,
    initPayload,
    expectedOrigin,
  });
  callbacksRef.current = {
    onReady,
    onComplete,
    onStateSave,
    onInteraction,
    onError,
    onDiagnostic,
    initPayload,
    expectedOrigin,
  };

  const postInit = () => {
    const { instanceId, nonce } = sessionRef.current;
    const envelope = {
      apiVersion: PROTOCOL_API_VERSION,
      type: 'init',
      instanceId,
      nonce,
      sequence: hostSequenceRef.current,
      payload: { ...initPayload, instanceId, nonce },
    };
    hostSequenceRef.current += 1;
    const targetOrigin = expectedOrigin === 'opaque' ? '*' : expectedOrigin;
    iframeRef.current?.contentWindow?.postMessage(envelope, targetOrigin);
  };

  const handleLoad = () => {
    if (cancelledRef.current || readyRef.current) return;
    postInit();
  };

  const clearTimers = () => {
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = null;
    }
  };

  useEffect(() => {
    activeFrames += 1;
    return () => {
      activeFrames -= 1;
    };
  }, []);

  useEffect(() => {
    // React StrictMode double-invokes effects: the cleanup below sets the
    // cancelled flag, so reset it here so this mount can still initialise.
    cancelledRef.current = false;
    // React's synthetic onLoad can miss the 'load' event on lazy/srcDoc
    // sandboxed iframes, so attach a native listener and keep re-posting the
    // init envelope until the widget acknowledges (bounded by READY_TIMEOUT_MS).
    const iframe = iframeRef.current;
    const onLoad = () => handleLoad();
    iframe?.addEventListener('load', onLoad);
    const retry = setInterval(() => {
      if (cancelledRef.current || readyRef.current) {
        clearInterval(retry);
        return;
      }
      if (iframeRef.current?.contentWindow) {
        handleLoad();
      }
    }, 250);
    const stop = setTimeout(() => {
      clearInterval(retry);
    }, READY_TIMEOUT_MS + 500);
    return () => {
      iframe?.removeEventListener('load', onLoad);
      clearInterval(retry);
      clearTimeout(stop);
    };
  }, []);

  useEffect(() => {
    const stored = callbacksRef.current.initPayload.storedState;
    const expected = callbacksRef.current.initPayload.stateSchemaVersion;
    if (
      expected &&
      typeof stored === 'object' &&
      stored !== null &&
      'schemaVersion' in stored &&
      (stored as { schemaVersion?: unknown }).schemaVersion !== expected
    ) {
      stateIncompatibleRef.current = true;
      callbacksRef.current.onDiagnostic?.('state-incompatible');
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    const postToWidget = (type: string, payload: unknown) => {
      const { instanceId, nonce } = sessionRef.current;
      const envelope = {
        apiVersion: PROTOCOL_API_VERSION,
        type,
        instanceId,
        nonce,
        sequence: hostSequenceRef.current,
        payload,
      };
      hostSequenceRef.current += 1;
      const targetOrigin =
        callbacksRef.current.expectedOrigin === 'opaque'
          ? '*'
          : callbacksRef.current.expectedOrigin;
      iframeRef.current?.contentWindow?.postMessage(envelope, targetOrigin);
    };

    const handleMessage = (event: MessageEvent) => {
      if (cancelledRef.current) return;

      if (!rateLimiterRef.current.allow()) {
        callbacksRef.current.onDiagnostic?.('rate-limit');
        return;
      }

      const session = sessionRef.current;
      const result = validateHostBoundMessage(event.data, String(event.origin ?? ''), session);
      if (!result.ok) {
        callbacksRef.current.onDiagnostic?.(result.reason);
        return;
      }

      const msg = result.message;
      session.lastSequence = msg.sequence;

      if (!readyRef.current) {
        if (msg.type === 'ready') {
          readyRef.current = true;
          if (readyTimeoutRef.current) {
            clearTimeout(readyTimeoutRef.current);
            readyTimeoutRef.current = null;
          }
          callbacksRef.current.onReady();
        } else {
          callbacksRef.current.onDiagnostic?.(`pre-ready-${msg.type}`);
        }
        return;
      }

      const {
        onComplete: cbComplete,
        onStateSave: cbState,
        onInteraction: cbInteract,
      } = callbacksRef.current;
      switch (msg.type) {
        case 'ready':
          break;
        case 'complete': {
          if (stateIncompatibleRef.current) {
            callbacksRef.current.onDiagnostic?.('state-incompatible');
            break;
          }
          const capabilities = callbacksRef.current.initPayload.capabilities;
          const observeGate =
            capabilities.includes('observe-mode') &&
            !capabilities.includes('telemetry-interaction');
          if (observeGate) {
            callbacksRef.current.onDiagnostic?.('observe-mode-complete-rejected');
            break;
          }
          cbComplete(msg.payload as CompletePayload);
          break;
        }
        case 'interaction':
          cbInteract(msg.payload as InteractionPayload);
          break;
        case 'state:save': {
          const raw = msg.payload as {
            requestId?: string;
            schemaVersion?: string;
            state?: unknown;
          };
          const stateSize = JSON.stringify(raw.state ?? null).length;
          const oversized = stateSize > MAX_STATE_BYTES;
          const expected = callbacksRef.current.initPayload.stateSchemaVersion;
          const versionMatches = !expected || raw.schemaVersion === expected;
          if (oversized) {
            postToWidget('state:update', {
              requestId: raw.requestId,
              accepted: false,
              rejectionReason: 'too-large',
            });
            callbacksRef.current.onDiagnostic?.('state-save-rejected');
            break;
          }
          if (!versionMatches) {
            postToWidget('state:update', {
              requestId: raw.requestId,
              accepted: false,
              rejectionReason: 'schema-invalid',
            });
            callbacksRef.current.onDiagnostic?.('state-save-rejected');
            break;
          }
          stateIncompatibleRef.current = false;
          postToWidget('state:update', {
            requestId: raw.requestId,
            accepted: true,
            normalizedState: raw.state,
          });
          cbState(msg.payload as StateSavePayload);
          break;
        }
        case 'resize': {
          const height = (msg.payload as { height: number }).height;
          if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
          resizeTimerRef.current = setTimeout(() => {
            resizeTimerRef.current = null;
            if (iframeRef.current) {
              iframeRef.current.style.height = `${clampResizeHeight(height)}px`;
            }
          }, 100);
          break;
        }
        case 'error':
          callbacksRef.current.onError((msg.payload as { message: string }).message);
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    readyTimeoutRef.current = setTimeout(() => {
      if (cancelledRef.current || readyRef.current) return;
      callbacksRef.current.onError('timeout');
      setErrored(true);
    }, READY_TIMEOUT_MS);

    return () => {
      cancelledRef.current = true;
      window.removeEventListener('message', handleMessage);
      clearTimers();
    };
  }, []);

  if (errored) {
    return (
      <div role="status" data-testid="sandbox-widget-error" aria-live="polite">
        {props.title}
      </div>
    );
  }

  return (
    <div role="region" aria-label={title} data-testid="sandbox-widget-host">
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        loading="lazy"
        title={title}
        data-testid="sandbox-widget-frame"
        frameBorder={0}
        src={documentUrl}
        srcDoc={srcDoc}
      />
    </div>
  );
}
