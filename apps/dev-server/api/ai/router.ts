import { z } from 'zod';
import {
  generateDraftRequestSchema,
  itemAddRequestSchema,
  itemEditRequestSchema,
  chatRequestSchema,
} from './requestSchema.js';
import { generateDraft } from './generateDraft.js';
import { generateItem } from './itemGeneration.js';
import { gatewayChat } from './chat.js';
import {
  isAllowedOrigin,
  assertBodyLimits,
  checkGatewayRateLimit,
  guardedHandler,
  type GatewaySafeguardOptions,
} from './safeguards.js';
import { GatewayError, safeErrorBody } from './errors.js';

export type GatewayRoute = 'status' | 'generate-draft' | 'item' | 'chat';

export interface GatewayRouterOptions {
  safeguards?: GatewaySafeguardOptions;
  isAvailable?: () => boolean;
}

export interface RouteRequest {
  method: string;
  path: string;
  body?: unknown;
  origin?: string;
  ip?: string;
}

export interface RouteResponse {
  status: number;
  body: unknown;
}

function makeRequestId(): string {
  return `gw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseRoute(pathname: string): GatewayRoute | null {
  if (pathname === '/api/ai/status' || pathname === '/status') return 'status';
  if (pathname === '/api/ai/generate-draft' || pathname === '/generate-draft')
    return 'generate-draft';
  if (pathname === '/api/ai/item' || pathname === '/item') return 'item';
  if (pathname === '/api/ai/chat' || pathname === '/chat') return 'chat';
  return null;
}

/**
 * Stateless, transport-independent gateway router. Takes a normalized request
 * and returns a normalized response. The serverless handler in [...route].ts
 * adapts HTTP to/from this shape. No server-side draft or session state is kept.
 */
export async function routeRequest(
  req: RouteRequest,
  options: GatewayRouterOptions = {},
): Promise<RouteResponse> {
  const requestId = makeRequestId();
  const opts = options.safeguards ?? {};

  if (req.method !== 'GET' && req.method !== 'POST') {
    return {
      status: 405,
      body: safeErrorBody(requestId, 'unsupported-method', `Unsupported method ${req.method}`),
    };
  }

  if (!isAllowedOrigin(req.origin, opts)) {
    return {
      status: 403,
      body: safeErrorBody(requestId, 'origin-not-allowed', 'Origin is not allowed.'),
    };
  }

  if (checkGatewayRateLimit(req.ip, opts)) {
    return {
      status: 429,
      body: safeErrorBody(requestId, 'rate-limited', 'Too many requests. Try again shortly.'),
    };
  }

  const route = parseRoute(req.path);
  if (!route) {
    return { status: 404, body: safeErrorBody(requestId, 'invalid-request', 'Unknown route.') };
  }

  if (route === 'status') {
    if (req.method === 'GET') {
      const available = options.isAvailable ? options.isAvailable() : true;
      return {
        status: 200,
        body: { requestId, available, reason: available ? undefined : 'missing-key' },
      };
    }
    return {
      status: 405,
      body: safeErrorBody(requestId, 'unsupported-method', 'Use GET for status.'),
    };
  }

  // All non-status routes are POST.
  if (req.method !== 'POST') {
    return { status: 405, body: safeErrorBody(requestId, 'unsupported-method', 'Use POST.') };
  }

  try {
    assertBodyLimits(req.body, requestId);
  } catch (err) {
    if (err instanceof GatewayError) {
      return { status: err.status, body: safeErrorBody(requestId, err.code, err.message) };
    }
    throw err;
  }

  const fn = () => dispatch(route, req, requestId, options);
  return guardedHandler(requestId, opts, fn);
}

async function dispatch(
  route: GatewayRoute,
  req: RouteRequest,
  requestId: string,
  options: GatewayRouterOptions,
): Promise<unknown> {
  switch (route) {
    case 'generate-draft': {
      const parsed = generateDraftRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new GatewayError('invalid-request', zErrorMessage(parsed), requestId);
      }
      return generateDraft(parsed.data, requestId, {
        isAvailable: options.isAvailable,
      });
    }
    case 'item': {
      const candidate = req.body ?? {};
      const isAdd = (candidate as { intent?: unknown }).intent === undefined;
      const schema = isAdd ? itemAddRequestSchema : itemEditRequestSchema;
      const parsed = schema.safeParse(candidate);
      if (!parsed.success) {
        throw new GatewayError('invalid-request', zErrorMessage(parsed), requestId);
      }
      return generateItem(candidate as never, requestId);
    }
    case 'chat': {
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new GatewayError('invalid-request', zErrorMessage(parsed), requestId);
      }
      return gatewayChat(parsed.data, requestId);
    }
    default:
      throw new GatewayError('invalid-request', 'Unknown route', requestId);
  }
}

function zErrorMessage(result: { error: z.ZodError }): string {
  return result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}
