import { describe, it, expect, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';

function mockReq(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    url: '/api/dictionary/lookup?word=test',
    headers: { host: 'localhost' },
    ...overrides,
  } as unknown as IncomingMessage;
}

function mockRes() {
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    end: vi.fn(),
  };
}

vi.mock('../../src/dictionary-server.js', () => ({
  handleDictionaryRequest: vi.fn((_req: IncomingMessage, res: ServerResponse) => {
    res.end(JSON.stringify({ word: 'test' }));
    return true;
  }),
}));

import dictionaryHandler from '../dictionary-vercel.js';

describe('dictionary Vercel adapter', () => {
  it('delegates to handleDictionaryRequest for lookup', async () => {
    const res = mockRes();
    await dictionaryHandler(
      mockReq({ url: '/api/dictionary/lookup?word=test' }),
      res as unknown as ServerResponse,
    );
    expect(res.end).toHaveBeenCalled();
    const body = JSON.parse((res.end as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(body.word).toBe('test');
  });

  it('delegates to handleDictionaryRequest for search', async () => {
    const res = mockRes();
    await dictionaryHandler(
      mockReq({ url: '/api/dictionary/search?q=hello' }),
      res as unknown as ServerResponse,
    );
    expect(res.end).toHaveBeenCalled();
  });

  it('delegates to handleDictionaryRequest for autocomplete', async () => {
    const res = mockRes();
    await dictionaryHandler(
      mockReq({ url: '/api/dictionary/autocomplete?prefix=ap' }),
      res as unknown as ServerResponse,
    );
    expect(res.end).toHaveBeenCalled();
  });

  it('delegates unknown paths to the handler (which will 404)', async () => {
    const res = mockRes();
    await dictionaryHandler(
      mockReq({ url: '/api/dictionary/unknown' }),
      res as unknown as ServerResponse,
    );
    expect(res.end).toHaveBeenCalled();
  });
});
