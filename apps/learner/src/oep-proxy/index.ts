import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { createLogger } from '@open-edu/logger';

export const OEP_PROXY_PATH = '/api/oep-proxy';
export const OEP_PROXY_TIMEOUT_MS = 30_000;
export const MAX_PROXY_REDIRECTS = 5;

const proxyLogger = createLogger({ scope: 'oep:proxy' });

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface ProxyResponse {
  statusCode: number;
  headersSent: boolean;
  writableEnded: boolean;
  setHeader(name: string, value: string): void;
  write(chunk: Uint8Array): boolean;
  end(chunk?: Uint8Array | string): void;
}

export function isBlockedProxyTarget(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true;
  if (host.startsWith('127.')) return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('169.254.')) return true;
  const privateRange172 = /^172\.(\d+)\./.exec(host);
  if (privateRange172) {
    const octet = Number(privateRange172[1]);
    if (octet >= 16 && octet <= 31) return true;
  }
  if (host.startsWith('100.')) {
    const cgnatRange100 = /^100\.(\d+)\./.exec(host);
    if (cgnatRange100) {
      const octet = Number(cgnatRange100[1]);
      if (octet >= 64 && octet <= 127) return true;
    }
  }
  if (
    host.startsWith('192.0.') ||
    host.startsWith('198.18.') ||
    host.startsWith('198.19.') ||
    host.startsWith('224.') ||
    host.startsWith('240.')
  ) {
    return true;
  }
  return false;
}

export class ProxyValidationError extends Error {}

export function isPrivateIp(ip: string): boolean {
  if (!ip.includes(':')) return isBlockedProxyTarget(ip);
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (/^fe[8-f]/.test(lower)) return true;
  const mapped = lower.match(/^::ffff:(.+)$/);
  if (mapped) {
    let dotted = mapped[1]!;
    if (!dotted.includes('.')) {
      const groups = dotted.split(':');
      const high = Number.parseInt(groups[0] ?? '0', 16);
      const low = Number.parseInt(groups[1] ?? '0', 16);
      dotted = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
    }
    return isBlockedProxyTarget(dotted);
  }
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
    if (current.protocol === 'https:' && nextUrl.protocol !== 'https:') {
      throw new ProxyValidationError('Proxy redirect downgrade blocked');
    }
    await assertPublicTarget(nextUrl);
    current = nextUrl;
  }
}

export function parseProxyTarget(reqUrl: string): URL | null {
  let requestUrl: URL;
  try {
    requestUrl = new URL(reqUrl, 'http://localhost');
  } catch {
    return null;
  }
  const rawTarget = requestUrl.searchParams.get('url');
  if (!rawTarget) return null;

  let target: URL;
  try {
    target = new URL(rawTarget);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(target.protocol)) return null;
  if (blockPrivateTargets() && isBlockedProxyTarget(target.hostname)) return null;
  return target;
}

function blockPrivateTargets(): boolean {
  const override = process.env.OEP_PROXY_ALLOW_PRIVATE;
  return override !== 'true' && override !== '1';
}

export function isProxyPath(url: string | undefined): url is string {
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

async function forwardToTarget(target: URL, res: ProxyResponse): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OEP_PROXY_TIMEOUT_MS);

  try {
    await assertPublicTarget(target);
    const upstream = await fetchWithSafeRedirects(target, controller.signal);
    if (!upstream.ok) {
      sendJson(res, upstream.status, {
        error: 'UPSTREAM_ERROR',
        status: upstream.status,
        message: upstream.statusText,
      });
      return;
    }

    res.statusCode = upstream.status || 200;
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'no-store');

    if (upstream.body) {
      const body = upstream.body as unknown as AsyncIterable<Uint8Array>;
      for await (const chunk of body) {
        if (res.writableEnded) return;
        res.write(chunk);
      }
    }
    if (!res.writableEnded) res.end();
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
}

function sendJson(res: ProxyResponse, statusCode: number, data: unknown): void {
  if (res.writableEnded) return;
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
