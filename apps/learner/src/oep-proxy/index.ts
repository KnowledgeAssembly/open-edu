import type { IncomingMessage } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { RequestOptions } from 'node:http';
import type { LookupAddress } from 'node:dns';
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

interface PinnedResponse {
  status: number;
  statusMessage: string;
  headers: Record<string, string | string[] | undefined>;
  body: AsyncIterable<Uint8Array>;
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

function decodeEmbeddedIpv4(encoded: string): string {
  if (encoded.includes('.')) return encoded;
  const groups = encoded.split(':');
  const low = Number.parseInt(groups[groups.length - 1] ?? '0', 16);
  const high = Number.parseInt(groups[groups.length - 2] ?? '0', 16);
  return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
}

export function isPrivateIp(ip: string): boolean {
  if (!ip.includes(':')) return isBlockedProxyTarget(ip);
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (/^fe[8-f]/.test(lower)) return true;
  const ipv4Translated = lower.match(/^::ffff:0:(.+)$/);
  if (ipv4Translated) return isBlockedProxyTarget(decodeEmbeddedIpv4(ipv4Translated[1]!));
  const ipv4Mapped = lower.match(/^::ffff:(.+)$/);
  if (ipv4Mapped) return isBlockedProxyTarget(decodeEmbeddedIpv4(ipv4Mapped[1]!));
  const nat64 = lower.match(/^64:ff9b(?::1)?::(.+)$/);
  if (nat64) return isBlockedProxyTarget(decodeEmbeddedIpv4(nat64[1]!));
  const ipv4Compatible = lower.match(/^::(.+)$/);
  if (ipv4Compatible) return isBlockedProxyTarget(decodeEmbeddedIpv4(ipv4Compatible[1]!));
  return false;
}

export async function resolvePublicTarget(target: URL): Promise<LookupAddress[]> {
  if (!blockPrivateTargets()) return [];
  const hostname = target.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new ProxyValidationError(`Proxy target "${hostname}" is a private address`);
    }
    return [{ address: hostname, family: isIP(hostname) }];
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) {
    throw new ProxyValidationError(`Proxy target "${hostname}" did not resolve to any address`);
  }
  for (const entry of addresses) {
    if (isPrivateIp(entry.address)) {
      throw new ProxyValidationError(`Proxy target "${hostname}" resolves to a private address`);
    }
  }
  return addresses;
}

export async function assertPublicTarget(target: URL): Promise<void> {
  await resolvePublicTarget(target);
}

function requestPinned(
  target: URL,
  signal: AbortSignal,
  addresses: LookupAddress[],
): Promise<PinnedResponse> {
  const lib = target.protocol === 'https:' ? httpsRequest : httpRequest;
  const hostname = target.hostname.replace(/^\[|\]$/g, '');
  const options: RequestOptions = {
    hostname,
    port: target.port ? Number(target.port) : undefined,
    path: `${target.pathname}${target.search}`,
    method: 'GET',
    headers: { accept: '*/*' },
    signal,
  };
  // Pin the connection to the pre-validated address so the target cannot be
  // re-resolved (DNS rebinding) between validation and connect time. Host and
  // SNI keep the original hostname, so TLS certificate validation is intact.
  if (addresses.length > 0) {
    options.lookup = (_hostname, _opts, callback) => {
      const address = addresses[0]!;
      if ((_opts as { all?: boolean }).all) {
        callback(null, [address]);
        return;
      }
      callback(null, address.address, address.family);
    };
  }
  if (target.protocol === 'https:') {
    (options as RequestOptions & { servername: string }).servername = hostname;
  }
  return new Promise((resolve, reject) => {
    const req = lib(options, (res: IncomingMessage) => {
      resolve({
        status: res.statusCode ?? 0,
        statusMessage: res.statusMessage ?? '',
        headers: res.headers,
        body: res as unknown as AsyncIterable<Uint8Array>,
      });
    });
    req.on('error', reject);
    req.end();
  });
}

export async function fetchWithSafeRedirects(
  target: URL,
  signal: AbortSignal,
): Promise<PinnedResponse> {
  let current = target;
  let hops = 0;
  for (;;) {
    const addresses = await resolvePublicTarget(current);
    const response = await requestPinned(current, signal, addresses);
    if (!REDIRECT_STATUSES.has(response.status)) return response;
    const rawLocation = response.headers.location;
    const location = typeof rawLocation === 'string' ? rawLocation : undefined;
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
    (response.body as { resume?: () => void }).resume?.();
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
    const upstream = await fetchWithSafeRedirects(target, controller.signal);
    if (upstream.status < 200 || upstream.status >= 300) {
      (upstream.body as { resume?: () => void }).resume?.();
      sendJson(res, upstream.status, {
        error: 'UPSTREAM_ERROR',
        status: upstream.status,
        message: upstream.statusMessage,
      });
      return;
    }

    res.statusCode = upstream.status;
    const upstreamContentType = upstream.headers['content-type'];
    res.setHeader(
      'Content-Type',
      typeof upstreamContentType === 'string' ? upstreamContentType : 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'no-store');

    for await (const chunk of upstream.body) {
      if (res.writableEnded) return;
      res.write(chunk);
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
