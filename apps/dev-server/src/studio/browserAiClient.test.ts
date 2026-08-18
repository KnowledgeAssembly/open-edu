// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDatabase, resetDatabase } from '@open-edu/storage';
import { BrowserAiClient } from './browserAiClient.js';

function mockGatewayResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('BrowserAiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(async () => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetDatabase();
    const db = await openDatabase();
    await db.clear('studio-drafts');
    db.close();
    resetDatabase();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports AI availability from /api/ai/status', async () => {
    fetchMock.mockResolvedValueOnce(mockGatewayResponse(200, { available: true }));
    const client = new BrowserAiClient();
    const status = await client.getStatus();
    expect(status.available).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/ai/status', expect.anything());
  });

  it('reports unavailable without throwing when the gateway errors', async () => {
    fetchMock.mockResolvedValueOnce(
      mockGatewayResponse(503, { error: { code: 'missing-config' } }),
    );
    const client = new BrowserAiClient();
    const status = await client.getStatus();
    expect(status.available).toBe(false);
  });

  it('never sends API keys in requests', async () => {
    fetchMock.mockResolvedValueOnce(mockGatewayResponse(200, { available: true }));
    const client = new BrowserAiClient();
    await client.getStatus();
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(JSON.stringify(headers)).not.toMatch(/api[_-]?key|authorization|bearer/i);
  });

  it('generates a draft, persists it locally, and returns response files', async () => {
    const response = {
      requestId: 'gw-1',
      success: true,
      title: 'My Course',
      version: '1.0.0',
      files: [
        { path: 'package.json', content: btoa('{"id":"x"}'), encoding: 'base64' },
        { path: 'nodes/lesson.md', content: '# Lesson', encoding: 'utf8' },
      ],
      outlinePreview: [{ title: 'Lesson', kind: 'lesson' }],
      quality: [{ id: 'objectives', labelKey: 'k', passed: true }],
    };
    fetchMock.mockResolvedValueOnce(mockGatewayResponse(200, response));

    const client = new BrowserAiClient();
    const result = await client.generateDraft({ notes: 'teach fractions' }, 'course-a');
    expect(result.success).toBe(true);

    const drafts = await client.listDrafts('course-a');
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.courseId).toBe('course-a');
    expect(drafts[0]!.files.some((f) => f.path === 'package.json')).toBe(true);

    // The stored bytes decode correctly (base64).
    const stored = drafts[0]!.files.find((f) => f.path === 'package.json')!;
    expect(new TextDecoder().decode(new Uint8Array(stored.data))).toBe('{"id":"x"}');
  });

  it('persists drafts across client instances (survives reload)', async () => {
    const response = {
      requestId: 'gw-2',
      success: true,
      title: 'Persist',
      files: [{ path: 'package.json', content: '{}', encoding: 'utf8' }],
      outlinePreview: [],
      quality: [],
    };
    fetchMock.mockResolvedValueOnce(mockGatewayResponse(200, response));

    const client = new BrowserAiClient();
    await client.generateDraft({ spec: '{}', specExt: '.json' }, 'course-b');

    // A "new page" instance reads the same browser store.
    const reloadedClient = new BrowserAiClient();
    const drafts = await reloadedClient.listDrafts('course-b');
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.title).toBe('Persist');
  });

  it('discards a local draft', async () => {
    const response = {
      requestId: 'gw-3',
      success: true,
      title: 'ToDiscard',
      files: [{ path: 'package.json', content: '{}', encoding: 'utf8' }],
      outlinePreview: [],
      quality: [],
    };
    fetchMock.mockResolvedValueOnce(mockGatewayResponse(200, response));

    const client = new BrowserAiClient();
    await client.generateDraft({ spec: '{}', specExt: '.json' }, 'course-c');
    const drafts = await client.listDrafts('course-c');
    await client.discardDraft(drafts[0]!.id);
    expect(await client.listDrafts('course-c')).toHaveLength(0);
  });

  it('maps gateway errors to BrowserAiClientError codes', async () => {
    fetchMock.mockResolvedValueOnce(
      mockGatewayResponse(429, { error: { code: 'rate-limited', message: 'Slow down' } }),
    );
    const client = new BrowserAiClient();
    await expect(client.generateDraft({ notes: 'x'.repeat(60) }, 'c')).rejects.toMatchObject({
      code: 'rate-limited',
    });
  });

  it('calls the gateway item endpoint', async () => {
    const body = { kind: 'lesson', description: 'Explain X' };
    fetchMock.mockResolvedValueOnce(
      mockGatewayResponse(200, { requestId: 'r', ok: true, item: {} }),
    );
    const client = new BrowserAiClient();
    await client.generateItem(body);
    expect(fetchMock).toHaveBeenCalledWith('/api/ai/item', expect.anything());
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(body);
  });

  it('calls the gateway chat endpoint and returns a deterministic result', async () => {
    fetchMock.mockResolvedValueOnce(
      mockGatewayResponse(200, { requestId: 'r', terminal: 'finished', content: 'Hi' }),
    );
    const client = new BrowserAiClient();
    const result = await client.chat([{ role: 'user', content: 'hello' }]);
    expect(result.terminal).toBe('finished');
    expect(result.content).toBe('Hi');
  });
});
