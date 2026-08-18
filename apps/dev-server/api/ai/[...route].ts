// Vercel Node.js serverless function. Never Edge runtime — the course
// compiler and core use Node filesystem/path APIs. Configured via
// apps/dev-server/vercel.json -> functions.api/ai/[...route].js.runtime.
//
// The function is stateless: it never keeps a draft registry, never commits,
// and never stores course or draft bytes server-side.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { routeRequest } from './router.js';
import { isAiAvailable } from '../../src/studio/ai/studioLlm.js';
import { MAX_REQUEST_BODY_BYTES } from './requestSchema.js';

const ALLOWED_ORIGINS = (process.env.OPEN_EDU_GATEWAY_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length > MAX_REQUEST_BODY_BYTES) {
        tooLarge = true;
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const origin = req.headers.origin;
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;

  const originAllowed =
    !origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');

  if (req.method === 'OPTIONS') {
    if (!originAllowed) {
      sendJson(res, 403, {
        error: { code: 'origin-not-allowed', message: 'Origin is not allowed.' },
      });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  let body: unknown;
  if (req.method === 'POST') {
    try {
      body = await readRequestBody(req);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON';
      const code = message.includes('too large') ? 'payload-too-large' : 'invalid-request';
      sendJson(res, message.includes('too large') ? 413 : 400, {
        requestId: 'gw-parse-error',
        error: {
          code,
          message: message.includes('too large')
            ? 'Request body exceeds the size limit.'
            : 'Invalid JSON body.',
        },
      });
      return;
    }
  }

  const result = await routeRequest(
    {
      method: req.method ?? 'GET',
      path: pathname,
      body,
      origin,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
    },
    { safeguards: { allowedOrigins: ALLOWED_ORIGINS }, isAvailable: isAiAvailable },
  );

  if (origin && originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  sendJson(res, result.status, result.body);
}
