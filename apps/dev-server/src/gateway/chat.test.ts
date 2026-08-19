// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { gatewayChat } from './chat.js';

describe('gatewayChat', () => {
  it('returns a finished terminal event with content from the LLM', async () => {
    const result = await gatewayChat(
      {
        messages: [{ role: 'user', content: 'Summarize the course' }],
        context: { view: 'outline', locale: 'en', aiAvailable: true },
      },
      'req-1',
      { completeText: async () => 'Here is a summary.' },
    );
    expect(result.requestId).toBe('req-1');
    expect(result.terminal).toBe('finished');
    expect(result.content).toBe('Here is a summary.');
  });

  it('returns a deterministic error terminal on provider failure without leaking details', async () => {
    const result = await gatewayChat(
      {
        messages: [{ role: 'user', content: 'x' }],
        context: { view: 'outline', locale: 'en', aiAvailable: true },
      },
      'req-2',
      {
        completeText: async () => {
          throw new Error('provider 401 invalid key');
        },
      },
    );
    expect(result.terminal).toBe('error');
    expect(result.error).toBeTruthy();
    expect(result.error).not.toMatch(/401|invalid key/);
  });

  it('rejects a request with no user message', async () => {
    await expect(
      gatewayChat({ messages: [], context: undefined }, 'req-3', {
        completeText: async () => 'x',
      }),
    ).rejects.toMatchObject({ code: 'invalid-request' });
  });
});
