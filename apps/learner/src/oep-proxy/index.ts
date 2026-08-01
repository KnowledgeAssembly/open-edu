import type { IncomingMessage } from 'node:http';
import { createLogger } from '@open-edu/logger';

export const OEP_PROXY_PATH = '/api/oep-proxy';
export const OEP_PROXY_TIMEOUT_MS = 30_000;

const proxyLogger = createLogger({ scope: 'oep:proxy' });

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

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
  return false;
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

export function oepProxyHandler(req: IncomingMessage, res: ProxyResponse, next: () => void): void {
  if (req.method !== 'GET' || !req.url?.startsWith(OEP_PROXY_PATH)) {
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

  void forwardToTarget(target, res);
}

async function forwardToTarget(target: URL, res: ProxyResponse): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OEP_PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(target, { signal: controller.signal, redirect: 'follow' });
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
