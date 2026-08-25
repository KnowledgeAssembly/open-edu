import type { IncomingMessage, ServerResponse } from 'node:http';
import { MULTI_FILE_CSP } from '@open-edu/widget-sdk/fixtures';
import {
  WidgetAlreadyInstalledError,
  WidgetValidationError,
  WidgetNotFoundError,
} from './store.js';
import type { WidgetRegistryStore } from './store.js';
export { WidgetRegistryStore } from './store.js';

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const BASE_PATH = '/widget-registry';
const VERSION_RESOURCE_RE =
  /^\/widget-registry\/([^/]+)\/([^/]+)\/([^/]+)\/(manifest\.json|index\.html|artifact\.zip|revoke)$/;

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function applyCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('request body too large'));
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function decodeBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

export function createWidgetRegistryRouter(store: WidgetRegistryStore) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const { pathname } = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';

      if (method === 'OPTIONS') {
        // No CORS headers on preflight: cross-origin browsers cannot send the
        // JSON-body install/revoke writes to this dev-only admin API.
        res.statusCode = 204;
        res.end();
        return;
      }

      if (method === 'GET') {
        applyCors(res);
      }

      if (method === 'POST' && pathname === `${BASE_PATH}/install`) {
        await handleInstall(req, res, store);
        return;
      }

      if (method === 'GET' && pathname === `${BASE_PATH}/catalog.json`) {
        const catalog = await store.catalog();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'max-age=3600, must-revalidate');
        res.statusCode = 200;
        res.end(JSON.stringify(catalog));
        return;
      }

      const resource = VERSION_RESOURCE_RE.exec(pathname);
      if (resource) {
        const publisher = resource[1];
        const widget = resource[2];
        const version = resource[3];
        const name = resource[4];
        if (!publisher || !widget || !version || !name) {
          sendJson(res, 404, { error: 'not found' });
          return;
        }
        if (name === 'artifact.zip') {
          await handleArtifact(res);
          return;
        }
        if (name === 'revoke' && method === 'POST') {
          await handleRevoke(store, res, publisher, widget, version);
          return;
        }
        if (name === 'manifest.json' && method === 'GET') {
          await handleManifest(store, res, publisher, widget, version);
          return;
        }
        if (name === 'index.html' && method === 'GET') {
          await handleDocument(store, res, publisher, widget, version);
          return;
        }
        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      sendJson(res, 404, { error: 'not found' });
    } catch (err) {
      console.error('[widget-registry] error:', err);
      sendJson(res, 500, { error: 'internal error' });
    }
  };
}

async function handleInstall(
  req: IncomingMessage,
  res: ServerResponse,
  store: WidgetRegistryStore,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'invalid JSON body' });
    return;
  }

  const input = body as {
    publisher?: unknown;
    widgetId?: unknown;
    manifestJson?: unknown;
    documentBase64?: unknown;
    documentBytes?: unknown;
    archiveBase64?: unknown;
  };

  if (
    typeof input.publisher !== 'string' ||
    typeof input.widgetId !== 'string' ||
    input.manifestJson === undefined
  ) {
    sendJson(res, 400, { error: 'missing publisher, widgetId, or manifestJson' });
    return;
  }

  let documentBytes: Uint8Array | undefined;
  if (typeof input.documentBase64 === 'string') {
    documentBytes = decodeBase64(input.documentBase64);
  } else if (Array.isArray(input.documentBytes)) {
    documentBytes = Uint8Array.from(input.documentBytes as number[]);
  }
  if (!documentBytes) {
    sendJson(res, 400, { error: 'missing document' });
    return;
  }

  const archiveBytes =
    typeof input.archiveBase64 === 'string' ? decodeBase64(input.archiveBase64) : undefined;

  try {
    await store.install({
      publisher: input.publisher,
      widgetId: input.widgetId,
      manifestJson: input.manifestJson,
      documentBytes,
      archiveBytes,
    });
    sendJson(res, 201, { ok: true });
  } catch (err) {
    if (err instanceof WidgetValidationError) {
      sendJson(res, 400, { error: 'widget validation failed', details: err.errors });
      return;
    }
    if (err instanceof WidgetAlreadyInstalledError) {
      sendJson(res, 409, { error: err.message });
      return;
    }
    throw err;
  }
}

async function handleArtifact(res: ServerResponse): Promise<void> {
  sendJson(res, 404, { error: 'archive download not available' });
}

async function handleRevoke(
  store: WidgetRegistryStore,
  res: ServerResponse,
  publisher: string,
  widget: string,
  version: string,
): Promise<void> {
  try {
    await store.revoke(publisher, widget, version);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    if (err instanceof WidgetNotFoundError) {
      sendJson(res, 404, { error: 'widget not found' });
      return;
    }
    throw err;
  }
}

async function handleManifest(
  store: WidgetRegistryStore,
  res: ServerResponse,
  publisher: string,
  widget: string,
  version: string,
): Promise<void> {
  try {
    const bytes = await store.readManifestBytes(publisher, widget, version);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'max-age=3600, must-revalidate');
    res.end(Buffer.from(bytes));
  } catch (err) {
    if (err instanceof WidgetNotFoundError) {
      sendJson(res, 404, { error: 'manifest not found' });
      return;
    }
    throw err;
  }
}

async function handleDocument(
  store: WidgetRegistryStore,
  res: ServerResponse,
  publisher: string,
  widget: string,
  version: string,
): Promise<void> {
  try {
    const bytes = await store.readDocument(publisher, widget, version);
    const manifest = await store.readManifest(publisher, widget, version);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (manifest.artifact.format === 'multi-file') {
      res.setHeader('Content-Security-Policy', MULTI_FILE_CSP);
    } else {
      const html = new TextDecoder().decode(bytes);
      const meta = /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/i.exec(
        html,
      );
      res.setHeader('Content-Security-Policy', meta?.[1] ?? MULTI_FILE_CSP);
    }
    res.end(Buffer.from(bytes));
  } catch (err) {
    if (err instanceof WidgetNotFoundError) {
      sendJson(res, 404, { error: 'document not found' });
      return;
    }
    throw err;
  }
}

export function createWidgetRegistryMiddleware(store: WidgetRegistryStore) {
  const router = createWidgetRegistryRouter(store);
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (!pathname.startsWith(BASE_PATH)) return next();
    void router(req, res);
  };
}
