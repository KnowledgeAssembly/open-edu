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
