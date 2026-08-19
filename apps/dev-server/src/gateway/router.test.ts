// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { routeRequest } from './router.js';
import { resetGatewayRateLimits } from './safeguards.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SPEC_PATH = resolve(
  import.meta.dirname,
  '__tests__',
  'fixtures',
  'runtime-smoke-course-spec.json',
);

beforeEach(() => {
  resetGatewayRateLimits();
});

describe('gateway router', () => {
  it('rejects unknown methods', async () => {
    const res = await routeRequest({ method: 'DELETE', path: '/api/ai/status' });
    expect(res.status).toBe(405);
    expect((res.body as { error: { code: string } }).error.code).toBe('unsupported-method');
  });

  it('rejects disallowed origins', async () => {
    const res = await routeRequest(
      { method: 'POST', path: '/api/ai/chat', origin: 'https://evil.example' },
      { safeguards: { allowedOrigins: ['https://studio.example'] } },
    );
    expect(res.status).toBe(403);
    expect((res.body as { error: { code: string } }).error.code).toBe('origin-not-allowed');
  });

  it('returns status with requestId', async () => {
    const res = await routeRequest({ method: 'GET', path: '/api/ai/status' });
    expect(res.status).toBe(200);
    const body = res.body as { requestId: string; available: boolean };
    expect(body.requestId).toBeTruthy();
    expect(typeof body.available).toBe('boolean');
  });

  it('reports unavailable status when AI is not configured', async () => {
    const res = await routeRequest(
      { method: 'GET', path: '/api/ai/status' },
      { isAvailable: () => false },
    );
    expect(res.status).toBe(200);
    expect((res.body as { available: boolean; reason: string }).available).toBe(false);
    expect((res.body as { available: boolean; reason: string }).reason).toBe('missing-key');
  });

  it('compiles a spec draft and returns complete file bytes', async () => {
    const spec = await readFile(SPEC_PATH, 'utf-8');
    const res = await routeRequest({
      method: 'POST',
      path: '/api/ai/generate-draft',
      body: { spec, specExt: '.json' },
    });
    expect(res.status).toBe(200);
    const body = res.body as {
      success: boolean;
      title: string;
      files: Array<{ path: string; content: string }>;
      requestId: string;
    };
    expect(body.success).toBe(true);
    expect(body.requestId).toBeTruthy();
    expect(body.files.some((f) => f.path === 'package.json')).toBe(true);
    expect(body.files.some((f) => f.path.startsWith('nodes/'))).toBe(true);
  });

  it('rejects a draft request with both notes and spec', async () => {
    const res = await routeRequest({
      method: 'POST',
      path: '/api/ai/generate-draft',
      body: { notes: 'teach fractions fractions fractions', spec: '{}', specExt: '.json' },
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('invalid-request');
  });

  it('maps a compile failure to a safe generation-error', async () => {
    const res = await routeRequest({
      method: 'POST',
      path: '/api/ai/generate-draft',
      body: { spec: '{}', specExt: '.json' },
    });
    expect(res.status).toBe(422);
    const body = res.body as { error: { code: string; message: string }; requestId: string };
    expect(body.error.code).toBe('generation-error');
    expect(body.requestId).toBeTruthy();
    expect(body.error.message).not.toMatch(/\/Users\//);
    expect(body.error.message).not.toMatch(/tmp\/openedu/);
  });

  it('returns safe generation-error for item when AI is unavailable', async () => {
    const res = await routeRequest(
      {
        method: 'POST',
        path: '/api/ai/item',
        body: { kind: 'lesson', description: 'Explain fractions' },
      },
      { isAvailable: () => false },
    );
    expect([400, 502]).toContain(res.status);
    const body = res.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe('generation-error');
    expect(body.error.message).not.toMatch(/api[_-]?key/i);
  });

  it('validates item body via schema', async () => {
    const res = await routeRequest({
      method: 'POST',
      path: '/api/ai/item',
      body: { kind: 'bogus', description: 'x' },
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('invalid-request');
  });

  it('validates chat body and returns a deterministic chat result with mocked LLM', async () => {
    const res = await routeRequest(
      {
        method: 'POST',
        path: '/api/ai/chat',
        body: {
          messages: [{ role: 'user', content: 'summarize the course' }],
          context: { view: 'outline', locale: 'en', aiAvailable: true },
        },
      },
      {
        safeguards: { allowedOrigins: [] },
        chatDeps: { completeText: async () => 'Mocked gateway response.' },
      },
    );
    expect(res.status).toBe(200);
    const body = res.body as { requestId: string; terminal: string };
    expect(body.requestId).toBeTruthy();
    expect(body.terminal).toBe('finished');
  });

  it('enforces rate limiting', async () => {
    for (let i = 0; i < 60; i++) {
      const res = await routeRequest(
        { method: 'GET', path: '/api/ai/status', ip: '127.0.0.1' },
        { safeguards: { rateLimitPerMinute: 59 } },
      );
      if (res.status === 429) break;
    }
    const blocked = await routeRequest(
      { method: 'GET', path: '/api/ai/status', ip: '127.0.0.1' },
      { safeguards: { rateLimitPerMinute: 59 } },
    );
    expect(blocked.status).toBe(429);
    expect((blocked.body as { error: { code: string } }).error.code).toBe('rate-limited');
  });

  it('rejects oversized request bodies', async () => {
    const huge = 'x'.repeat(10_000_001);
    const res = await routeRequest({
      method: 'POST',
      path: '/api/ai/chat',
      body: { messages: [{ role: 'user', content: huge }] },
    });
    expect(res.status).toBe(413);
    expect((res.body as { error: { code: string } }).error.code).toBe('payload-too-large');
  });
});
