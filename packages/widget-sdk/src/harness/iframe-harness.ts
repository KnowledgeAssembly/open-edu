import { validateHostBoundMessage } from '../validate-message.js';
import type { HostSession } from '../validate-message.js';
import type { WidgetMessageEnvelope } from '@open-edu/schemas';

export interface IframeHarnessOptions {
  documentHtml: string;
  origin: string;
}

export interface IframeHarness {
  iframe: HTMLIFrameElement;
  messages: WidgetMessageEnvelope[];
  dispatch(data: unknown, origin?: string): void;
  destroy(): void;
}

export function createIframeHarness(options: IframeHarnessOptions): IframeHarness {
  const session: HostSession = {
    instanceId: 'test-instance',
    nonce: 'test-nonce',
    expectedOrigin: options.origin,
    lastSequence: 0,
  };
  const messages: WidgetMessageEnvelope[] = [];

  const handle = (data: unknown, origin: string) => {
    const result = validateHostBoundMessage(data, origin, session);
    if (result.ok) messages.push(result.message);
  };

  const dispatch = (data: unknown, origin = options.origin) => {
    globalThis.dispatchEvent(new MessageEvent('message', { data, origin }));
  };

  const onMessage = (event: MessageEvent) => handle(event.data, event.origin ?? '');

  globalThis.addEventListener('message', onMessage);

  const iframe = document.createElement('iframe');
  iframe.sandbox = 'allow-scripts';
  iframe.srcdoc = options.documentHtml;
  document.body.appendChild(iframe);

  return {
    iframe,
    messages,
    dispatch,
    destroy() {
      globalThis.removeEventListener('message', onMessage);
      iframe.remove();
    },
  };
}
