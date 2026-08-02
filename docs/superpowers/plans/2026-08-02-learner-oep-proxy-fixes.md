# Learner OEP Proxy Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all issues found in the review of PR #530 (`fix/learner-course-install-cors`) — production deployment gap, SSRF via redirects and DNS, preview-server middleware parity, exact path matching, timeout error coverage, and i18n error surfacing.

**Architecture:** Keep the proxy logic in a single framework-agnostic core (`apps/learner/src/oep-proxy/index.ts`) that operates on a structural `ProxyResponse` interface. Two thin adapters consume it: (a) Vite dev/preview middleware and (b) a Vercel serverless function (`apps/learner/api/oep-proxy.ts`) so the fix also works in the static production deployment. Harden SSRF with DNS-resolution checks plus manual redirect re-validation. Register the same middleware stack in both dev and preview servers. Surface proxy error codes to the UI through translated i18n keys.

**Tech Stack:** TypeScript 5.x, Vite 5.x middleware, Vercel Node serverless functions, Node `node:http` / `node:net` / `node:dns/promises`, Vitest 1.x, `@open-edu/i18n`.

**Branch:** Work is committed on top of `fix/learner-course-install-cors` (the PR #530 branch). The repository is currently checked out on this branch at commit `8ad46c0`.

---

## File Structure

| File                                                  | Responsibility                                                                 | Action                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------- |
| `apps/learner/src/oep-proxy/index.ts`                 | Proxy core: path matching, URL parsing, SSRF checks, safe redirects, streaming | Modify (Tasks 1–3)    |
| `apps/learner/src/oep-proxy/index.test.ts`            | Unit tests for the proxy core                                                  | Modify (Tasks 1–4, 5) |
| `apps/learner/src/oep-proxy/test-helpers.ts`          | Shared mock `ServerResponse` / request helpers                                 | Create (Task 5)       |
| `apps/learner/api/oep-proxy.ts`                       | Vercel serverless function entrypoint (re-exports the adapter)                 | Create (Task 5)       |
| `apps/learner/api/tsconfig.json`                      | Standalone typecheck config for the function                                   | Create (Task 5)       |
| `apps/learner/src/oep-proxy/vercel.test.ts`           | Unit tests for the Vercel function adapter                                     | Create (Task 5)       |
| `apps/learner/src/oep-proxy/vercel.ts`                | Vercel function adapter logic (kept under `src/` so it is unit-testable)       | Create (Task 5)       |
| `apps/learner/package.json`                           | `typecheck` script covers `api/`                                               | Modify (Task 5)       |
| `apps/learner/vite.config.ts`                         | Shared middleware registration for dev + preview                               | Modify (Task 6)       |
| `apps/learner/src/oep-proxy/client.ts`                | Browser helpers: `proxyUrl`, `proxyFetch`, `proxyErrorCode`                    | Modify (Task 7)       |
| `apps/learner/src/oep-proxy/client.test.ts`           | Unit tests for `proxyFetch` / `proxyErrorCode`                                 | Create (Task 7)       |
| `apps/learner/src/components/CatalogInstallView.tsx`  | Catalog fetch via proxy + i18n error mapping                                   | Modify (Task 7)       |
| `apps/learner/src/CatalogPage.tsx`                    | Auto-catalog fetch via proxy                                                   | Modify (Task 7)       |
| `apps/learner/src/components/InstallCourseDialog.tsx` | Translated generic error in catch blocks                                       | Modify (Task 7)       |
| `packages/i18n/locales/en/learner.json`               | New `learner.proxy.error.*` keys                                               | Modify (Task 7)       |

---

## Task 1: Exact path matching + awaitable handler

The handler currently matches any path _starting with_ `/api/oep-proxy` and fires the upstream fetch without awaiting (`void forwardToTarget(...)`). Fix both: match the exact path, and make the handler async so consumers (Vite middleware and the Vercel function) can await completion.

**Files:**

- Modify: `apps/learner/src/oep-proxy/index.ts:62-78`
- Test: `apps/learner/src/oep-proxy/index.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe('oepProxyHandler')` block in `apps/learner/src/oep-proxy/index.test.ts`:

```ts
it('calls next for a prefix-only path that is not the proxy endpoint', () => {
  const res = createMockRes();
  const next = vi.fn();
  oepProxyHandler(mockRequest('/api/oep-proxy-foo?url=x'), res, next);
  expect(next).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: the new test FAILS (the current `startsWith` check treats `/api/oep-proxy-foo` as a proxy path and returns a 400 instead of calling `next`).

- [ ] **Step 3: Add `isProxyPath` and make the handler async**

In `apps/learner/src/oep-proxy/index.ts`, add `isProxyPath` above `oepProxyHandler` and replace the handler with this exact code (the `forwardToTarget` change to `await` is included):

```ts
export function isProxyPath(url: string | undefined): boolean {
  if (!url) return false;
  const pathname = url.split('?')[0];
  return pathname === OEP_PROXY_PATH;
}

export async function oepProxyHandler(
  req: IncomingMessage,
  res: ProxyResponse,
  next: () => void,
): Promise<void> {
  if (req.method !== 'GET' || !isProxyPath(req.url)) {
    next();
    return;
  }

  const target = parseProxyTarget(req.url);
  if (!target) {
    sendJson(res, 400, {
      error: 'INVALID_URL',
      message: 'Proxy requires a valid public http(s) URL in the "url" query parameter',
    });
    return;
  }

  await forwardToTarget(target, res);
}
```

The handler now awaits the upstream flow via `await forwardToTarget(target, res);` (previously `void forwardToTarget(target, res);`). The `forwardToTarget` function body is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: all existing tests still PASS (the non-proxy and blocked-target paths execute synchronously before the first `await`, so the existing un-awaited test calls still work), plus the new test PASSes.

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/oep-proxy/index.ts apps/learner/src/oep-proxy/index.test.ts
git commit -m "fix(learner): match exact oep proxy path and await upstream handling"
```

---

## Task 2: SSRF — block targets that resolve to private addresses

The current check is string-prefix based on the hostname only. Add: (a) an `isPrivateIp` helper covering IPv6 loopback/ULA/link-local and IPv4-mapped IPv6, and (b) an async `assertPublicTarget` that resolves hostnames via DNS and rejects any target whose resolved address is private. `ProxyValidationError` maps to HTTP 400 `INVALID_URL`.

**Files:**

- Modify: `apps/learner/src/oep-proxy/index.ts`
- Test: `apps/learner/src/oep-proxy/index.test.ts`

- [ ] **Step 1: Write the failing tests**

At the top of `apps/learner/src/oep-proxy/index.test.ts`, add the DNS module mock and import the new symbols:

```ts
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
```

Extend the import from `./index.js`:

```ts
import { lookup } from 'node:dns/promises';
import {
  OEP_PROXY_PATH,
  oepProxyHandler,
  parseProxyTarget,
  isBlockedProxyTarget,
  isPrivateIp,
  assertPublicTarget,
  ProxyValidationError,
} from './index.js';
```

Add two new `describe` blocks plus one integration test inside `describe('oepProxyHandler')`:

```ts
describe('isPrivateIp', () => {
  it('blocks IPv6 loopback and unspecified addresses', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('::')).toBe(true);
  });

  it('blocks IPv6 unique-local addresses (fc00::/7)', () => {
    expect(isPrivateIp('fd00::1')).toBe(true);
    expect(isPrivateIp('fc00::')).toBe(true);
  });

  it('blocks IPv6 link-local addresses (fe80::/10)', () => {
    expect(isPrivateIp('fe80::1')).toBe(true);
    expect(isPrivateIp('fe90::1')).toBe(true);
    expect(isPrivateIp('febf::1')).toBe(true);
  });

  it('blocks IPv4-mapped private IPv6 addresses', () => {
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
  });

  it('allows public IPv6 addresses', () => {
    expect(isPrivateIp('2606:4700::1111')).toBe(false);
  });

  it('delegates IPv4 addresses to isBlockedProxyTarget', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('140.82.112.4')).toBe(false);
  });
});

describe('assertPublicTarget', () => {
  beforeEach(() => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
    vi.mocked(lookup).mockReset();
  });

  it('rejects a hostname that resolves to a private address', async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(
      assertPublicTarget(new URL('https://spoofed.example.com/a.oep')),
    ).rejects.toBeInstanceOf(ProxyValidationError);
  });

  it('rejects a literal private address', async () => {
    await expect(assertPublicTarget(new URL('http://169.254.169.254/meta'))).rejects.toBeInstanceOf(
      ProxyValidationError,
    );
  });

  it('resolves for a public hostname', async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: '140.82.112.4', family: 4 }]);
    await expect(
      assertPublicTarget(new URL('https://github.com/x/a.oep')),
    ).resolves.toBeUndefined();
  });

  it('skips the check when OEP_PROXY_ALLOW_PRIVATE is enabled', async () => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', 'true');
    vi.mocked(lookup).mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(
      assertPublicTarget(new URL('https://spoofed.example.com/a.oep')),
    ).resolves.toBeUndefined();
  });
});
```

Inside `describe('oepProxyHandler')`, add this integration test:

```ts
it('returns 400 when the target resolves to a private address', async () => {
  vi.mocked(lookup).mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }]);
  const res = createMockRes();
  oepProxyHandler(
    mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://spoofed.example.com/x.oep')}`),
    res,
    () => {},
  );
  await vi.waitFor(() => expect(res.writableEnded).toBe(true));
  expect(res.statusCode).toBe(400);
  expect(JSON.parse(res.body).error).toBe('INVALID_URL');
});
```

In the `describe('oepProxyHandler')` `beforeEach`, ensure the DNS lookup resolves to a public address so existing tests keep working:

```ts
beforeEach(() => {
  vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
  globalThis.fetch = vi.fn();
  vi.mocked(lookup).mockResolvedValue([{ address: '140.82.112.4', family: 4 }]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: the new `isPrivateIp` and `assertPublicTarget` tests FAIL (functions don't exist), and the existing handler tests FAIL (`assertPublicTarget` is undefined / DNS not mocked).

- [ ] **Step 3: Implement the SSRF hardening**

In `apps/learner/src/oep-proxy/index.ts`:

Add imports at the top:

```ts
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
```

Add `ProxyValidationError`, `isPrivateIp`, and `assertPublicTarget` after `isBlockedProxyTarget` (keep `parseProxyTarget` as-is):

```ts
export class ProxyValidationError extends Error {}

export function isPrivateIp(ip: string): boolean {
  if (!ip.includes(':')) return isBlockedProxyTarget(ip);
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(lower)) return true;
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedProxyTarget(mapped[1]!);
  return false;
}

export async function assertPublicTarget(target: URL): Promise<void> {
  if (!blockPrivateTargets()) return;
  const hostname = target.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new ProxyValidationError(`Proxy target "${hostname}" is a private address`);
    }
    return;
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  for (const entry of addresses) {
    if (isPrivateIp(entry.address)) {
      throw new ProxyValidationError(`Proxy target "${hostname}" resolves to a private address`);
    }
  }
}
```

In `forwardToTarget`, add the assertion before the upstream fetch and map `ProxyValidationError` in the catch block. The `try` block starts with:

```ts
  try {
    await assertPublicTarget(target);
    const upstream = await fetch(target, { signal: controller.signal, redirect: 'follow' });
```

And the `catch` block becomes:

```ts
  } catch (err) {
    if (err instanceof ProxyValidationError) {
      sendJson(res, 400, { error: 'INVALID_URL', message: err.message });
      return;
    }
    proxyLogger.error(
      'OEP proxy fetch failed',
      err instanceof Error ? err : new Error(String(err)),
      { target: target.toString() },
    );
    if (!res.headersSent) {
      sendJson(res, 502, { error: 'PROXY_ERROR', message: 'Failed to fetch remote resource' });
    } else if (!res.writableEnded) {
      res.end();
    }
  } finally {
    clearTimeout(timer);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: all tests PASS (existing handler tests use the mocked public DNS resolution).

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/oep-proxy/index.ts apps/learner/src/oep-proxy/index.test.ts
git commit -m "fix(learner): block oep proxy targets that resolve to private addresses"
```

---

## Task 3: SSRF — safe redirect following

`redirect: 'follow'` re-validates nothing after the first hop, so a public URL can redirect to a private/loopback target. Replace with `redirect: 'manual'` and re-validate every hop (protocol + private-address check). Cap redirects to avoid infinite loops.

**Files:**

- Modify: `apps/learner/src/oep-proxy/index.ts`
- Test: `apps/learner/src/oep-proxy/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Inside `describe('oepProxyHandler')` in `apps/learner/src/oep-proxy/index.test.ts`, add:

```ts
it('follows public redirects and streams the final response', async () => {
  vi.mocked(globalThis.fetch)
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://objects.githubusercontent.com/x/a.oep' },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('redirected-bytes'));
            controller.close();
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/octet-stream' } },
      ),
    );

  const res = createMockRes();
  oepProxyHandler(
    mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
    res,
    () => {},
  );
  await vi.waitFor(() => expect(res.writableEnded).toBe(true));

  expect(res.statusCode).toBe(200);
  expect(res.body).toBe('redirected-bytes');
});

it('blocks a redirect to a private host', async () => {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce(
    new Response(null, {
      status: 302,
      headers: { location: 'http://169.254.169.254/meta' },
    }),
  );

  const res = createMockRes();
  oepProxyHandler(
    mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
    res,
    () => {},
  );
  await vi.waitFor(() => expect(res.writableEnded).toBe(true));

  expect(res.statusCode).toBe(400);
  expect(JSON.parse(res.body).error).toBe('INVALID_URL');
});

it('blocks a redirect to a non-http protocol', async () => {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce(
    new Response(null, { status: 302, headers: { location: 'file:///etc/passwd' } }),
  );

  const res = createMockRes();
  oepProxyHandler(
    mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
    res,
    () => {},
  );
  await vi.waitFor(() => expect(res.writableEnded).toBe(true));

  expect(res.statusCode).toBe(400);
  expect(JSON.parse(res.body).error).toBe('INVALID_URL');
});

it('returns 502 when the target redirects too many times', async () => {
  for (let i = 0; i < 6; i++) {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://github.com/x/a.oep' },
      }),
    );
  }

  const res = createMockRes();
  oepProxyHandler(
    mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
    res,
    () => {},
  );
  await vi.waitFor(() => expect(res.writableEnded).toBe(true));

  expect(res.statusCode).toBe(502);
  expect(JSON.parse(res.body).error).toBe('PROXY_ERROR');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: `follows public redirects...` FAILS (with `redirect: 'follow'`, undici follows the 302 itself; the mocked second response is never used and the handler ends with the 302 status). The private-host and protocol redirect tests FAIL (the redirect is followed rather than blocked). The too-many-redirects test FAILS.

- [ ] **Step 3: Implement safe redirect following**

In `apps/learner/src/oep-proxy/index.ts`:

Add constants after `OEP_PROXY_TIMEOUT_MS`:

```ts
export const MAX_PROXY_REDIRECTS = 5;
```

Add after the `ALLOWED_PROTOCOLS` declaration:

```ts
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
```

Add `fetchWithSafeRedirects` after `assertPublicTarget`:

```ts
export async function fetchWithSafeRedirects(target: URL, signal: AbortSignal): Promise<Response> {
  let current = target;
  let hops = 0;
  for (;;) {
    const response = await fetch(current, { signal, redirect: 'manual' });
    if (!REDIRECT_STATUSES.has(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    hops += 1;
    if (hops > MAX_PROXY_REDIRECTS) {
      throw new Error('Proxy target exceeded the redirect limit');
    }
    let nextUrl: URL;
    try {
      nextUrl = new URL(location, current);
    } catch {
      throw new ProxyValidationError('Proxy target returned an invalid redirect location');
    }
    if (!ALLOWED_PROTOCOLS.has(nextUrl.protocol)) {
      throw new ProxyValidationError('Proxy redirect blocked');
    }
    await assertPublicTarget(nextUrl);
    current = nextUrl;
  }
}
```

In `forwardToTarget`, replace the fetch line (added in Task 2) with:

```ts
const upstream = await fetchWithSafeRedirects(target, controller.signal);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: all tests PASS, including the four new redirect tests and all prior tests.

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/oep-proxy/index.ts apps/learner/src/oep-proxy/index.test.ts
git commit -m "fix(learner): re-validate oep proxy redirect hops to prevent SSRF"
```

---

## Task 4: Timeout / abort error path coverage

The 30s `AbortController` timeout surfaces as an `AbortError` rejection of the upstream `fetch`. It is currently untested; add a test documenting that an abort yields `502 PROXY_ERROR`.

**Files:**

- Test: `apps/learner/src/oep-proxy/index.test.ts`

- [ ] **Step 1: Write the failing test**

Inside `describe('oepProxyHandler')`, add:

```ts
it('returns 502 when the upstream request is aborted', async () => {
  vi.mocked(globalThis.fetch).mockRejectedValue(
    new DOMException('The operation was aborted', 'AbortError'),
  );

  const res = createMockRes();
  oepProxyHandler(
    mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
    res,
    () => {},
  );
  await vi.waitFor(() => expect(res.writableEnded).toBe(true));

  expect(res.statusCode).toBe(502);
  expect(JSON.parse(res.body).error).toBe('PROXY_ERROR');
});
```

- [ ] **Step 2: Run the test to confirm it documents existing behavior**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: the new test PASSES against the existing `forwardToTarget` catch block (the abort is not a `ProxyValidationError`, so it is handled by the generic error branch and mapped to 502). This is a regression/coverage test: it locks in the timeout behavior with no production code change.

- [ ] **Step 3: Commit**

```bash
git add apps/learner/src/oep-proxy/index.test.ts
git commit -m "test(learner): cover oep proxy timeout/abort error path"
```

---

## Task 5: Production fix — Vercel serverless function

The learner deploys to Vercel as a static Vite build (`apps/learner/vercel.json`, `outputDirectory: dist`), so the dev/preview-only middleware never runs in production. Add a Vercel Node serverless function that reuses `oepProxyHandler`. Vercel auto-detects `/api` functions at the project root; no `vercel.json` change is needed.

The adapter logic lives in `src/` (so it can be unit-tested under the learner `rootDir`), and the `api/` entrypoint is a one-line re-export. **Never place test files directly under `apps/learner/api/`** — Vercel treats every file there as a deployed serverless function.

**Files:**

- Create: `apps/learner/src/oep-proxy/vercel.ts` (adapter logic)
- Create: `apps/learner/api/oep-proxy.ts` (re-export entrypoint)
- Create: `apps/learner/api/tsconfig.json`
- Modify: `apps/learner/package.json`
- Create: `apps/learner/src/oep-proxy/test-helpers.ts`
- Modify: `apps/learner/src/oep-proxy/index.test.ts`
- Create: `apps/learner/src/oep-proxy/vercel.test.ts`

- [ ] **Step 1: Extract shared test helpers**

Create `apps/learner/src/oep-proxy/test-helpers.ts` (moved verbatim from `index.test.ts`):

```ts
import type { oepProxyHandler } from './index.js';

export function createMockRes() {
  const chunks: Uint8Array[] = [];
  const headers: Record<string, string> = {};
  let headersSent = false;
  let writableEnded = false;
  return {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    write(chunk: Uint8Array): boolean {
      headersSent = true;
      chunks.push(chunk);
      return true;
    },
    end(chunk?: Uint8Array | string): void {
      headersSent = true;
      writableEnded = true;
      if (chunk) {
        chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
      }
    },
    get headersSent() {
      return headersSent;
    },
    get writableEnded() {
      return writableEnded;
    },
    get headers() {
      return headers;
    },
    get body(): string {
      const total = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      return new TextDecoder().decode(merged);
    },
  };
}

export function mockRequest(url: string, method = 'GET') {
  return { method, url } as unknown as Parameters<typeof oepProxyHandler>[0];
}
```

In `apps/learner/src/oep-proxy/index.test.ts`, delete the local `createMockRes` and `mockRequest` definitions and add this import:

```ts
import { createMockRes, mockRequest } from './test-helpers.js';
```

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: all tests still PASS after the refactor.

- [ ] **Step 2: Write the failing Vercel function test**

Create `apps/learner/src/oep-proxy/vercel.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { lookup } from 'node:dns/promises';
import oepProxy from './vercel.js';
import { createMockRes, mockRequest } from './test-helpers.js';
import { OEP_PROXY_PATH } from './index.js';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

describe('oepProxy Vercel function', () => {
  beforeEach(() => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
    globalThis.fetch = vi.fn();
    vi.mocked(lookup).mockResolvedValue([{ address: '140.82.112.4', family: 4 }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns 404 for routes outside the proxy', async () => {
    const res = createMockRes();
    await oepProxy(
      mockRequest('/not-proxy') as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe('NOT_FOUND');
  });

  it('returns 400 for a blocked target', async () => {
    const res = createMockRes();
    await oepProxy(
      mockRequest(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('http://localhost/x')}`,
      ) as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_URL');
  });

  it('streams a proxied resource', async () => {
    const bytes = new TextEncoder().encode('fake-oep-bytes');
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/octet-stream' } },
      ),
    );
    const res = createMockRes();
    await oepProxy(
      mockRequest(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`,
      ) as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('fake-oep-bytes');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: `vercel.test.ts` FAILS (module `./vercel.js` cannot be resolved — the file does not exist yet).

- [ ] **Step 4: Implement the Vercel function**

Create `apps/learner/src/oep-proxy/vercel.ts` (the adapter — kept in `src/` so `vercel.test.ts` stays inside the learner `rootDir`):

```ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import { oepProxyHandler } from './index.js';

export default async function oepProxy(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await oepProxyHandler(req, res, () => {
    if (res.headersSent || res.writableEnded) return;
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Route not found' }));
  });
}
```

Create `apps/learner/api/oep-proxy.ts` (the deployed Vercel entrypoint — a one-line re-export; no test files belong in `api/`):

```ts
export { default } from '../src/oep-proxy/vercel.js';
```

Create `apps/learner/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["*.ts"]
}
```

In `apps/learner/package.json`, update the `typecheck` script so the function is typechecked (the existing `tsc --noEmit` only covers `src`):

```json
"typecheck": "tsc --noEmit && tsc --noEmit -p api/tsconfig.json",
```

- [ ] **Step 5: Run tests and typecheck to verify**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: all PASS (the new `vercel.test.ts` exercises the adapter inside `src/`).

Run: `pnpm --filter @open-edu/learner typecheck`
Expected: PASS (the main config compiles `src/vercel.ts` + `vercel.test.ts`; `api/tsconfig.json` compiles `api/oep-proxy.ts` and pulls in `vercel.ts` transitively; `@types/node` resolves from the monorepo root).

- [ ] **Step 6: Commit**

```bash
git add apps/learner/api/oep-proxy.ts apps/learner/api/tsconfig.json apps/learner/package.json apps/learner/src/oep-proxy/vercel.ts apps/learner/src/oep-proxy/vercel.test.ts apps/learner/src/oep-proxy/test-helpers.ts apps/learner/src/oep-proxy/index.test.ts
git commit -m "fix(learner): expose oep proxy as a Vercel serverless function for production"
```

> **Deployment note:** After merge, Vercel auto-detects `apps/learner/api/oep-proxy.ts` and routes `/api/oep-proxy` to it. Set `OEP_PROXY_ALLOW_PRIVATE=true` in Vercel environment variables if LAN catalog servers must be reachable from production.

---

## Task 6: Preview server middleware parity

The `configurePreviewServer` hook added in PR #530 registers only `oepProxyHandler`; the dev server registers the LLM proxy, Pipili, dictionary, and asset/catalog middleware too. Extract the full middleware registration into one shared function and call it from both hooks so `vite preview` is a faithful production-like server.

**Files:**

- Modify: `apps/learner/vite.config.ts`

- [ ] **Step 1: Extract the shared registration function**

In `apps/learner/vite.config.ts`, after `findAssetsDirs`, add the shared function. It contains exactly the middleware bodies currently in `configureServer`, moved verbatim:

```ts
type MiddlewareNext = () => void;
type MiddlewareServer = {
  middlewares: {
    use(handler: (req: IncomingMessage, res: ServerResponse, next: MiddlewareNext) => void): void;
    use(
      route: string,
      handler: (req: IncomingMessage, res: ServerResponse, next: MiddlewareNext) => void,
    ): void;
  };
};

function registerServerMiddlewares(server: MiddlewareServer): void {
  server.middlewares.use(oepProxyHandler);
  server.middlewares.use(llmProxyHandler);

  // Pipili AI Companion endpoint
  const pipiliHandler = createPipiliHandler();
  server.middlewares.use('/api/pipili', async (req, res, next) => {
    if (req.url?.startsWith('/chat')) {
      try {
        await pipiliHandler(req, res);
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'INTERNAL_ERROR' }));
        }
      }
      return;
    }
    next();
  });

  // Load dictionary on server startup
  const dictionaryDir = resolve(PKGS_DIR, 'ai-companion/src/data/external');
  loadDictionary(dictionaryDir);

  // Dictionary API endpoints (server-side search: never sends full dict to browser)
  server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: MiddlewareNext) => {
    if (handleDictionaryRequest(req, res)) return;
    next();
  });

  // Serve external dictionary static files at /dictionary/
  server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: MiddlewareNext) => {
    const url = decodeURIComponent(req.url ?? '');
    if (!url.startsWith('/dictionary/')) return next();
    const filePath = join(dictionaryDir, url.slice('/dictionary/'.length));
    if (!filePath.startsWith(dictionaryDir)) return next();
    try {
      if (statSync(filePath).isFile()) {
        const ext = extname(filePath);
        res.setHeader('Content-Type', ASSET_MIME_TYPES[ext] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(readFileSync(filePath));
        return;
      }
    } catch {
      // file not found
    }
    next();
  });

  const assetDirs = findAssetsDirs(CATALOG_DIR);
  if (assetDirs.length === 0) return;

  server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: MiddlewareNext) => {
    const requestPath = decodeURIComponent(req.url ?? '');
    if (!requestPath.startsWith('/assets/')) return next();

    const relativePath = requestPath.slice('/assets/'.length);
    for (const assetsDir of assetDirs) {
      const filePath = join(assetsDir, relativePath);
      if (!filePath.startsWith(assetsDir)) continue;
      try {
        const stat = statSync(filePath);
        if (stat.isFile()) {
          const ext = extname(filePath).toLowerCase();
          res.setHeader('Content-Type', ASSET_MIME_TYPES[ext] ?? 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(readFileSync(filePath));
          return;
        }
      } catch {
        continue;
      }
    }
    next();
  });

  console.log(`[edu-data] Serving assets from ${assetDirs.length} package(s) (${CATALOG_DIR})`);
}
```

- [ ] **Step 2: Replace the hook bodies**

Replace the body of `configureServer` with a single call:

```ts
    configureServer(server) {
      registerServerMiddlewares(server);
    },
```

Replace the body of `configurePreviewServer` with the same call:

```ts
    configurePreviewServer(server) {
      registerServerMiddlewares(server);
    },
```

- [ ] **Step 3: Typecheck and build**

Run: `pnpm --filter @open-edu/learner typecheck`
Expected: PASS. (Note: `vite.config.ts` is not in the `tsconfig.json` include; it is typechecked by Vite itself when the server starts, which the next step verifies.)

- [ ] **Step 4: Manually verify dev and preview servers**

Start the dev server and confirm the proxy and Pipili endpoints respond:

```bash
pnpm --filter @open-edu/learner dev
```

In a second shell:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4001/api/oep-proxy?url=http%3A%2F%2Flocalhost%2Fx"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:4001/api/pipili/chat" -H "Content-Type: application/json" -d '{}'
```

Expected: the proxy returns `400` (blocked `localhost` target, proving routing) and Pipili returns a non-404 status (e.g., `400`/`422` for the empty body). Stop the dev server.

Build and start the preview server, then repeat:

```bash
pnpm --filter @open-edu/learner build:deploy
pnpm --filter @open-edu/learner preview
```

In a second shell:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4173/api/oep-proxy?url=http%3A%2F%2Flocalhost%2Fx"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:4173/api/pipili/chat" -H "Content-Type: application/json" -d '{}'
```

Expected: proxy returns `400` (localhost target blocked) and Pipili returns a non-404 status — proving preview now registers the full middleware stack. Stop the preview server.

- [ ] **Step 5: Commit**

```bash
git add apps/learner/vite.config.ts
git commit -m "fix(learner): register all dev middleware in the preview server"
```

```bash
git add apps/learner/vite.config.ts
git commit -m "fix(learner): register all dev middleware in the preview server"
```

---

## Task 7: i18n error surfacing

The proxy returns English server-side strings that can reach the user (e.g., `CatalogLoadError("Catalog fetch failed: HTTP 400")`). Make the proxy errors machine-readable at the client and surface translated messages, per AGENTS.md Development Rule 5.

**Files:**

- Modify: `apps/learner/src/oep-proxy/client.ts`
- Create: `apps/learner/src/oep-proxy/client.test.ts`
- Modify: `apps/learner/src/components/CatalogInstallView.tsx`
- Modify: `apps/learner/src/CatalogPage.tsx`
- Modify: `apps/learner/src/components/InstallCourseDialog.tsx`
- Modify: `packages/i18n/locales/en/learner.json`

- [ ] **Step 1: Write the failing client tests**

Create `apps/learner/src/oep-proxy/client.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { proxyFetch, proxyErrorCode } from './client.js';

describe('proxyFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the response for a successful proxy request', async () => {
    const response = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(proxyFetch('https://github.com/x/a.oep')).resolves.toBe(response);
  });

  it('throws a ProxyFetchError with the proxy error code for a JSON error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'INVALID_URL', message: 'x' }), { status: 400 }),
        ),
    );
    const err = (await proxyFetch('http://localhost/x').catch((e: unknown) => e)) as unknown;
    expect(proxyErrorCode(err)).toBe('INVALID_URL');
    expect(err).toBeInstanceOf(Error);
  });

  it('falls back to PROXY_ERROR for a non-JSON error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 502 })));
    const err = (await proxyFetch('https://github.com/x/a.oep').catch(
      (e: unknown) => e,
    )) as unknown;
    expect(proxyErrorCode(err)).toBe('PROXY_ERROR');
  });

  it('returns null for non-proxy errors', () => {
    expect(proxyErrorCode(new Error('boom'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: `client.test.ts` FAILS (`proxyFetch` is not defined).

- [ ] **Step 3: Implement the client helpers**

Replace the entire contents of `apps/learner/src/oep-proxy/client.ts` with:

```ts
export const OEP_PROXY_PATH = '/api/oep-proxy';

export function proxyUrl(targetUrl: string): string {
  return `${OEP_PROXY_PATH}?url=${encodeURIComponent(targetUrl)}`;
}

export type ProxyErrorCode = 'INVALID_URL' | 'UPSTREAM_ERROR' | 'PROXY_ERROR';

export class ProxyFetchError extends Error {
  readonly code: ProxyErrorCode;
  readonly status: number;

  constructor(code: ProxyErrorCode, status: number) {
    super(`Proxy request failed with HTTP ${status} (${code})`);
    this.name = 'ProxyFetchError';
    this.code = code;
    this.status = status;
  }
}

const KNOWN_PROXY_ERROR_CODES: readonly ProxyErrorCode[] = [
  'INVALID_URL',
  'UPSTREAM_ERROR',
  'PROXY_ERROR',
];

export async function proxyFetch(targetUrl: string): Promise<Response> {
  const response = await fetch(proxyUrl(targetUrl));
  if (response.ok) return response;

  let code: ProxyErrorCode = 'PROXY_ERROR';
  try {
    const body = (await response.json()) as { error?: unknown };
    if (
      typeof body.error === 'string' &&
      (KNOWN_PROXY_ERROR_CODES as readonly string[]).includes(body.error)
    ) {
      code = body.error as ProxyErrorCode;
    }
  } catch {
    // non-JSON error body — fall back to a generic proxy error
  }
  throw new ProxyFetchError(code, response.status);
}

export function proxyErrorCode(err: unknown): ProxyErrorCode | null {
  return err instanceof ProxyFetchError ? err.code : null;
}
```

- [ ] **Step 4: Run client tests to verify they pass**

Run: `pnpm --filter @open-edu/learner test -- oep-proxy`
Expected: `client.test.ts` PASSes.

- [ ] **Step 5: Add the i18n keys**

Append these keys to `packages/i18n/locales/en/learner.json` (alphabetically near the other `catalog.*` / `install.*` keys):

```json
  "proxy.error.invalid_url": "The URL is not valid or points to a blocked host",
  "proxy.error.upstream_error": "The remote server returned an error",
  "proxy.error.proxy_error": "Could not download the resource. Please try again."
```

- [ ] **Step 6: Update the catalog fetch call sites**

In `apps/learner/src/components/CatalogInstallView.tsx`:

Replace the import of `fetchCatalog` from `@open-edu/oep-distribution` with `parseCatalog`:

```ts
import { parseCatalog, catalogSource } from '@open-edu/oep-distribution';
```

Replace the import from `../oep-proxy/client`:

```ts
import { proxyFetch, proxyErrorCode } from '../oep-proxy/client';
import type { ProxyErrorCode } from '../oep-proxy/client';
```

Replace `handleFetchCatalog`:

```ts
const handleFetchCatalog = useCallback(async () => {
  if (!catalogUrl.trim()) return;
  setIsLoading(true);
  setError(null);
  try {
    const response = await proxyFetch(catalogUrl.trim());
    const result = parseCatalog(await response.json());
    setCatalog(result);
  } catch (err) {
    setError(t(proxyErrorKey(err)));
  } finally {
    setIsLoading(false);
  }
}, [catalogUrl, t]);
```

Add the mapping helper at the bottom of the file (after the component):

```ts
const proxyErrorKeyMap: Record<ProxyErrorCode, string> = {
  INVALID_URL: 'learner.proxy.error.invalid_url',
  UPSTREAM_ERROR: 'learner.proxy.error.upstream_error',
  PROXY_ERROR: 'learner.proxy.error.proxy_error',
};

function proxyErrorKey(err: unknown): string {
  const code = proxyErrorCode(err);
  return code
    ? (proxyErrorKeyMap[code] ?? 'learner.catalog.fetch_error')
    : 'learner.catalog.fetch_error';
}
```

In `apps/learner/src/CatalogPage.tsx`:

Replace the import of `fetchCatalog` with `parseCatalog`:

```ts
import { parseCatalog } from '@open-edu/oep-distribution';
```

Replace the import from `./oep-proxy/client`:

```ts
import { proxyFetch } from './oep-proxy/client';
```

Replace the effect body (currently `fetchCatalog(proxyUrl(catalogUrl)).then(...)`) with:

```ts
proxyFetch(catalogUrl)
  .then((response) => response.json())
  .then((data) => parseCatalog(data))
  .then(setRemoteCatalog)
  .catch(() => {});
```

- [ ] **Step 7: Update the install dialog error handling**

In `apps/learner/src/components/InstallCourseDialog.tsx`, replace both catch blocks that currently show the raw error message:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInstalling(false);
    }
```

with (file install — generic error):

```ts
    } catch {
      setError(t('learner.install.error_unknown'));
    } finally {
      setIsInstalling(false);
    }
```

and (URL install — network error):

```ts
    } catch {
      setError(t('learner.install.error_network'));
    } finally {
      setIsInstalling(false);
    }
```

Remove the now-unused `err` parameter bindings. (The `installErrorKey(result)` path already maps coordinator error codes to translated keys and is unchanged.)

- [ ] **Step 8: Run the full test suite for the learner**

Run: `pnpm --filter @open-edu/learner test`
Expected: all tests PASS (including the existing `CatalogPage.test.tsx` and `InstallCourseDialog.test.tsx` — neither exercises the catalog fetch or the thrown-error path).

Run the i18n key validation to confirm the new keys are present:

```bash
node packages/i18n/src/i18n-keys.test.ts
```

Expected: PASS (keys resolve against `en/learner.json`).

- [ ] **Step 9: Commit**

```bash
git add apps/learner/src/oep-proxy/client.ts apps/learner/src/oep-proxy/client.test.ts apps/learner/src/components/CatalogInstallView.tsx apps/learner/src/CatalogPage.tsx apps/learner/src/components/InstallCourseDialog.tsx packages/i18n/locales/en/learner.json
git commit -m "fix(learner): surface translated errors for oep proxy failures"
```

---

## Final Verification

Before marking the branch complete, run the full checklist from AGENTS.md:

```bash
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/learner typecheck
pnpm --filter @open-edu/learner lint
pnpm prettier --check "apps/learner/src/oep-proxy/**" "apps/learner/api/**" apps/learner/vite.config.ts apps/learner/src/CatalogPage.tsx apps/learner/src/components/CatalogInstallView.tsx apps/learner/src/components/InstallCourseDialog.tsx apps/learner/src/components/AvailableUpdatesList.tsx apps/learner/package.json apps/learner/.env.example
node packages/i18n/src/i18n-keys.test.ts
```

All must pass with no new lint errors (the existing 40 `no-console` warnings in `src/` are pre-existing and unrelated; the new code adds none).

Manual smoke test in dev and preview:

```bash
pnpm --filter @open-edu/learner dev
curl -s "http://localhost:4001/api/oep-proxy?url=http%3A%2F%2Flocalhost%2Fx"   # expect 400 INVALID_URL
curl -s "http://localhost:4001/api/oep-proxy?url=https%3A%2F%2Fgithub.com%2Fspatnaik1982%2Fopenedu-library%2Freleases%2Fdownload%2Fv1.0.0%2Fa-1.0.0.oep" -o /tmp/a.oep -w "%{http_code}\n"  # expect 200 + valid ZIP bytes
```

Expected: blocked targets return `400` with `{"error":"INVALID_URL",...}`; the real GitHub release downloads successfully through the proxy (if the pinned version does not exist in `openedu-library`, substitute the current release tag and asset name from that repo).

---

## Self-Review

**Spec coverage:**

- Production gap (Issue 1) → Task 5 (Vercel serverless function) ✓
- Redirect SSRF (Issue 2) → Task 3 (manual redirect re-validation) ✓
- Preview parity (Issue 3) → Task 6 (shared middleware registration) ✓
- Resolution-based SSRF (Issue 4) → Task 2 (DNS lookup + IPv6/IPv4-mapped checks) ✓
- Exact path match (Issue 5) → Task 1 (`isProxyPath`) ✓
- Abort/timeout coverage (Issue 7) → Task 4 ✓
- i18n surfacing (Issue 6) → Task 7 (client error codes + translated keys) ✓

**Placeholder scan:** every step includes concrete code or exact commands; no TBDs. ✓

**Type consistency:** `oepProxyHandler`, `isProxyPath`, `assertPublicTarget`, `fetchWithSafeRedirects`, `ProxyValidationError`, `proxyFetch`, `proxyErrorCode`, and `ProxyErrorCode` are introduced once and reused consistently across tasks; the `ProxyResponse` interface is unchanged. ✓
