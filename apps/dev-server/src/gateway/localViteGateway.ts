import type { IncomingMessage, ServerResponse } from 'node:http';

type Next = () => void;
type GatewayHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

/**
 * Exposes the hosted AI gateway through the local Vite Node process. This is
 * deliberately opt-in so normal browser builds remain static and never turn
 * into an accidental local proxy.
 */
export function createLocalAiMiddleware(
  enabled: boolean,
  handler: GatewayHandler,
): (req: IncomingMessage, res: ServerResponse, next: Next) => void | Promise<void> {
  return async (req, res, next) => {
    const path = req.url?.split('?')[0];
    if (!enabled || (path !== '/api/ai' && !path?.startsWith('/api/ai/'))) {
      next();
      return;
    }

    await handler(req, res);
  };
}
