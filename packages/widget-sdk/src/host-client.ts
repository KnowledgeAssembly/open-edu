import { PROTOCOL_API_VERSION, InitPayloadSchema } from '@open-edu/schemas';
import type {
  CompletePayload,
  StateSavePayload,
  InitPayload,
  InteractionAction,
} from '@open-edu/schemas';
import { validateWidgetBoundMessage } from './validate-message';

export interface Window {
  postMessage(message: unknown, targetOrigin: string): void;
  parentOrigin: string | null;
}

export interface WidgetHostClientOptions {
  target: Window;
  instanceId: string;
  nonce: string;
}

export interface WidgetHostClient {
  post(type: string, payload: unknown, requestId?: string): void;
  ready(): void;
  complete(payload: CompletePayload): void;
  saveState(payload: StateSavePayload): void;
  interaction(action: InteractionAction, data?: Record<string, unknown>): void;
  resize(height: number): void;
  error(message: string): void;
  onInit(handler: (payload: InitPayload) => void): void;
}

export function createWidgetHostClient({
  target,
  instanceId,
  nonce,
}: WidgetHostClientOptions): WidgetHostClient {
  let sequence = 0;
  let lastHostSequence = 0;
  let initHandler: ((payload: InitPayload) => void) | undefined;

  const post = (type: string, payload: unknown, requestId?: string): void => {
    sequence += 1;
    target.postMessage(
      {
        apiVersion: PROTOCOL_API_VERSION,
        type,
        instanceId,
        nonce,
        sequence,
        requestId,
        payload,
      },
      target.parentOrigin ?? '*',
    );
  };

  const onInit = (handler: (payload: InitPayload) => void): void => {
    initHandler = handler;
  };

  globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
    const result = validateWidgetBoundMessage(event.data, String(event.origin ?? ''), {
      instanceId,
      nonce,
      expectedOrigin: 'opaque',
      lastSequence: lastHostSequence,
    });
    if (!result.ok) return;
    lastHostSequence = result.message.sequence;
    if (result.message.type === 'init' && initHandler) {
      const parsed = InitPayloadSchema.safeParse(result.message.payload);
      if (parsed.success) {
        initHandler(parsed.data);
      }
    }
  });

  return {
    post,
    ready: () => post('ready', {}),
    complete: (payload) => post('complete', payload),
    saveState: (payload) => post('state:save', payload),
    interaction: (action, data) => post('interaction', { action, data }),
    resize: (height) => post('resize', { height }),
    error: (message) => post('error', { message }),
    onInit,
  };
}
