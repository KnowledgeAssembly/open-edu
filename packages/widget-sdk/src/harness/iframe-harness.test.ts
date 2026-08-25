import { describe, it, expect, afterEach } from 'vitest';
import { createIframeHarness, type IframeHarness } from './iframe-harness';
import { WRONG_NONCE_MESSAGE, VALID_INIT_MESSAGE } from '../fixtures/protocol-fixtures';

const DOCUMENT_HTML = '<!doctype html><html><body></body></html>';
const ORIGIN = 'https://app.example.com';

const VALID_READY_MESSAGE = { ...VALID_INIT_MESSAGE, type: 'ready' as const, payload: {} };

const harnesses: IframeHarness[] = [];

afterEach(() => {
  for (const harness of harnesses) harness.destroy();
  harnesses.length = 0;
  document.body.innerHTML = '';
});

function makeHarness(): IframeHarness {
  const harness = createIframeHarness({ documentHtml: DOCUMENT_HTML, origin: ORIGIN });
  harnesses.push(harness);
  return harness;
}

describe('createIframeHarness', () => {
  it('validates and collects a dispatched host-bound message', () => {
    const harness = makeHarness();
    harness.dispatch(VALID_READY_MESSAGE);
    expect(harness.messages).toHaveLength(1);
    expect(harness.messages[0]).toMatchObject({ type: 'ready', sequence: 1 });
  });

  it('drops a rejected wrong-nonce message', () => {
    const harness = makeHarness();
    harness.dispatch(WRONG_NONCE_MESSAGE);
    expect(harness.messages).toHaveLength(0);
  });

  it('rejects a message from a foreign origin', () => {
    const harness = makeHarness();
    harness.dispatch(VALID_READY_MESSAGE, 'https://evil.example');
    expect(harness.messages).toHaveLength(0);
  });

  it('creates a sandboxed iframe without same-origin access', () => {
    const harness = makeHarness();
    const sandbox = String(harness.iframe.sandbox);
    expect(sandbox).toBe('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  it('stops collecting messages after destroy', () => {
    const harness = makeHarness();
    harness.dispatch(VALID_READY_MESSAGE);
    expect(harness.messages).toHaveLength(1);
    harness.destroy();
    harness.dispatch(VALID_READY_MESSAGE);
    expect(harness.messages).toHaveLength(1);
  });

  it('mounts a real iframe with the provided srcdoc', () => {
    const harness = makeHarness();
    expect(harness.iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(harness.iframe.getAttribute('srcdoc')).toBe(DOCUMENT_HTML);
    expect(harness.iframe.isConnected).toBe(true);
  });
});
