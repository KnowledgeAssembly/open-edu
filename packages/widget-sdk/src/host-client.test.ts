import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWidgetHostClient, type WidgetHostClient, type Window } from './host-client';

const INSTANCE_ID = 'inst-1';
const NONCE = 'nonce-1';

interface MockTarget {
  postMessage: ReturnType<typeof vi.fn>;
  parentOrigin: string | null;
}

let target: MockTarget;
let client: WidgetHostClient;

beforeEach(() => {
  target = { postMessage: vi.fn(), parentOrigin: null };
  client = createWidgetHostClient({
    target: target as unknown as Window,
    instanceId: INSTANCE_ID,
    nonce: NONCE,
  });
});

describe('createWidgetHostClient posting', () => {
  it('posts a ready envelope with sequence 1 and wildcard origin for srcdoc', () => {
    client.ready();
    const message = vi.mocked(target.postMessage).mock.calls[0]?.[0];
    const origin = vi.mocked(target.postMessage).mock.calls[0]?.[1];
    expect(message).toEqual({
      apiVersion: 'open-edu.widget/1',
      type: 'ready',
      instanceId: INSTANCE_ID,
      nonce: NONCE,
      sequence: 1,
      payload: {},
    });
    expect(origin).toBe('*');
  });

  it('increments sequence per post', () => {
    client.ready();
    client.interaction('select', { optionId: 'a' });
    const calls = vi.mocked(target.postMessage).mock.calls;
    expect(calls[1]?.[0]).toMatchObject({ type: 'interaction', sequence: 2 });
    expect(calls[1]?.[0]).toMatchObject({ payload: { action: 'select', data: { optionId: 'a' } } });
  });

  it('uses the configured parentOrigin when present', () => {
    target.parentOrigin = 'https://app.example.com';
    client.ready();
    const origin = vi.mocked(target.postMessage).mock.calls[0]?.[1];
    expect(origin).toBe('https://app.example.com');
  });
});

describe('createWidgetHostClient onInit', () => {
  it('calls the handler with the init payload for a valid init message', () => {
    const handler = vi.fn();
    client.onInit(handler);
    const initPayload = {
      apiVersion: 'open-edu.widget/1',
      widgetId: 'w',
      widgetVersion: '1.0.0',
      instanceId: INSTANCE_ID,
      nodeId: 'node',
      config: {},
      locale: 'en',
      theme: 'light',
      themeTokens: {},
      prefersReducedMotion: false,
      capabilities: [],
    };
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          apiVersion: 'open-edu.widget/1',
          type: 'init',
          instanceId: INSTANCE_ID,
          nonce: NONCE,
          sequence: 1,
          payload: initPayload,
        },
        origin: 'https://app.example.com',
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(initPayload);
  });

  it('does not call the handler again for a wrong-nonce message', () => {
    const handler = vi.fn();
    client.onInit(handler);
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          apiVersion: 'open-edu.widget/1',
          type: 'init',
          instanceId: INSTANCE_ID,
          nonce: NONCE,
          sequence: 1,
          payload: {
            apiVersion: 'open-edu.widget/1',
            widgetId: 'w',
            widgetVersion: '1.0.0',
            instanceId: INSTANCE_ID,
            nodeId: 'node',
            config: {},
            locale: 'en',
            theme: 'light',
            themeTokens: {},
            prefersReducedMotion: false,
            capabilities: [],
          },
        },
        origin: 'https://app.example.com',
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          apiVersion: 'open-edu.widget/1',
          type: 'init',
          instanceId: INSTANCE_ID,
          nonce: 'wrong-nonce',
          sequence: 2,
          payload: null,
        },
        origin: 'https://app.example.com',
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
