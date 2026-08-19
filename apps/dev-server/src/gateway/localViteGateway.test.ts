import { describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLocalAiMiddleware } from './localViteGateway.js';

function request(url: string): IncomingMessage {
  return { url } as IncomingMessage;
}

describe('createLocalAiMiddleware', () => {
  it('forwards browser AI requests to the gateway when explicitly enabled', async () => {
    const gateway = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn();
    const middleware = createLocalAiMiddleware(true, gateway);

    await middleware(request('/api/ai/status'), {} as ServerResponse, next);

    expect(gateway).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it('leaves the request untouched when local AI is disabled', async () => {
    const gateway = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn();
    const middleware = createLocalAiMiddleware(false, gateway);

    await middleware(request('/api/ai/status'), {} as ServerResponse, next);

    expect(gateway).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves unrelated requests untouched', async () => {
    const gateway = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn();
    const middleware = createLocalAiMiddleware(true, gateway);

    await middleware(request('/assets/app.js'), {} as ServerResponse, next);

    expect(gateway).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
