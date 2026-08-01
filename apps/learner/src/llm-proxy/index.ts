import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadConfig, createLlmProvider, type LlmConfig } from '@open-edu/llm-config';
import { z } from 'zod';
import { createRateLimiter } from './rate-limiter.js';
import { createLogger } from '@open-edu/logger';

const TIMEOUT_MS = 60_000;

const pipiliLogger = createLogger({ scope: 'pipili:service' });

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

function sendJson(res: ServerResponse, statusCode: number, data: Record<string, unknown>): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

const rateLimiter = createRateLimiter({ maxRequests: 20, windowMs: 60_000 });

export function llmProxyHandler(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  if (req.method !== 'POST' || !req.url?.startsWith('/api/llm/chat')) {
    next();
    return;
  }

  rateLimiter(req, res, () => {
    handleLlmRequest(req, res);
  });
}

async function handleLlmRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  pipiliLogger.info('LLM proxy request received', { url: req.url });
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid request';
    pipiliLogger.warn('Invalid LLM proxy request body', {
      error: msg,
    });
    sendJson(res, 400, { error: msg, code: 'INVALID_REQUEST' });
    return;
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    pipiliLogger.warn('LLM proxy request validation failed', {
      error: firstIssue?.message,
    });
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

  if (!config.apiKey && !config.baseURL) {
    pipiliLogger.warn('LLM API key not configured on the server', { code: 'MISSING_API_KEY' });
    sendJson(res, 503, {
      error:
        'LLM API key not configured on the server. Set LLM_API_KEY environment variable (or LLM_BASE_URL for a local endpoint like Ollama).',
      code: 'MISSING_API_KEY',
    });
    return;
  }

  let provider;
  try {
    provider = createLlmProvider(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Provider creation failed';
    pipiliLogger.error('LLM provider creation failed', err, { config: config.provider });
    sendJson(res, 500, { error: msg, code: 'PROVIDER_ERROR' });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    pipiliLogger.time('llm-call');
    const genericSchema = z.object({}).passthrough();
    const result = await provider.generateStructured(
      `You must respond with a single valid JSON object. ${prompt}`,
      genericSchema,
      { temperature: config.temperature, maxTokens: config.maxTokens },
    );
    pipiliLogger.timeEnd('llm-call');
    pipiliLogger.info('LLM proxy request completed', {
      provider: config.provider,
      model: config.model,
    });
    res.setHeader('Cache-Control', 'no-store');
    sendJson(res, 200, { content: JSON.stringify(result) });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        pipiliLogger.warn('LLM request timed out', { timeoutMs: TIMEOUT_MS });
        sendJson(res, 504, { error: 'LLM request timed out after 60s', code: 'TIMEOUT' });
        return;
      }
      if (err.message.includes('401') || err.message.includes('Incorrect API key')) {
        pipiliLogger.warn('LLM provider authentication failed', { code: 'AUTH_ERROR' });
        sendJson(res, 502, { error: 'LLM provider authentication failed', code: 'AUTH_ERROR' });
        return;
      }
      if (err.message.includes('429') || err.message.includes('Rate limit')) {
        pipiliLogger.warn('LLM provider rate limit exceeded', { code: 'PROVIDER_RATE_LIMIT' });
        sendJson(res, 502, {
          error: 'LLM provider rate limit exceeded',
          code: 'PROVIDER_RATE_LIMIT',
        });
        return;
      }
    }
    const msg = err instanceof Error ? err.message : 'Unknown LLM error';
    pipiliLogger.error('LLM proxy request failed', err, { code: 'LLM_ERROR' });
    sendJson(res, 502, { error: msg, code: 'LLM_ERROR' });
    return;
  } finally {
    clearTimeout(timer);
  }
}
