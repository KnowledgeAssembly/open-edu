import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadConfig, createLlmProvider, type LlmConfig } from '@open-edu/llm-config';
import { z } from 'zod';
import { createRateLimiter } from './rate-limiter.js';

const TIMEOUT_MS = 60_000;

const ALLOWED_ORIGINS = ['http://localhost:4001', 'http://localhost:4000'];

const chatRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt must be a non-empty string'),
  provider: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed !== 'object' || parsed === null) {
          reject(new Error('Body must be a JSON object'));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });
}

function setCorsHeaders(res: ServerResponse, origin: string): void {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4001');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res: ServerResponse, statusCode: number, data: Record<string, unknown>): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function writeCorsPreflightResponse(res: ServerResponse): void {
  res.statusCode = 204;
  res.end();
}

const rateLimiter = createRateLimiter({ maxRequests: 20, windowMs: 60_000 });

export function llmProxyHandler(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  if (!req.url?.startsWith('/api/llm/chat')) {
    next();
    return;
  }

  const origin = req.headers.origin ?? '';
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    writeCorsPreflightResponse(res);
    return;
  }

  if (req.method !== 'POST') {
    next();
    return;
  }

  rateLimiter(req, res, () => {
    handleLlmRequest(req, res);
  });
}

async function handleLlmRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid request';
    sendJson(res, 400, { error: msg, code: 'INVALID_REQUEST' });
    return;
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    sendJson(res, 400, {
      error: firstIssue ? firstIssue.message : 'Invalid request body',
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  const { prompt, provider: overProvider, model: overModel, maxTokens, temperature } = parsed.data;

  const config: LlmConfig = {
    ...loadConfig(),
    ...(overProvider ? { provider: overProvider } : {}),
    ...(overModel ? { model: overModel } : {}),
    ...(maxTokens !== undefined ? { maxTokens } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
  };

  if (!config.apiKey) {
    sendJson(res, 503, {
      error: 'LLM API key not configured on the server. Set LLM_API_KEY environment variable.',
      code: 'MISSING_API_KEY',
    });
    return;
  }

  let provider;
  try {
    provider = createLlmProvider(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Provider creation failed';
    sendJson(res, 500, { error: msg, code: 'PROVIDER_ERROR' });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const genericSchema = z.object({}).passthrough();
    const result = await provider.generateStructured(
      `You must respond with a single valid JSON object. ${prompt}`,
      genericSchema,
      { temperature: config.temperature, maxTokens: config.maxTokens },
    );
    res.setHeader('Cache-Control', 'no-store');
    sendJson(res, 200, { content: JSON.stringify(result) });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        sendJson(res, 504, { error: 'LLM request timed out after 60s', code: 'TIMEOUT' });
        return;
      }
      if (err.message.includes('401') || err.message.includes('Incorrect API key')) {
        sendJson(res, 502, { error: 'LLM provider authentication failed', code: 'AUTH_ERROR' });
        return;
      }
      if (err.message.includes('429') || err.message.includes('Rate limit')) {
        sendJson(res, 502, {
          error: 'LLM provider rate limit exceeded',
          code: 'PROVIDER_RATE_LIMIT',
        });
        return;
      }
    }
    const msg = err instanceof Error ? err.message : 'Unknown LLM error';
    sendJson(res, 502, { error: msg, code: 'LLM_ERROR' });
    return;
  } finally {
    clearTimeout(timer);
  }
}
