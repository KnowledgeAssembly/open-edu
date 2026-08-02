import type { IncomingMessage, ServerResponse } from 'http';
import { createPipiliHandler } from './handler.js';

const handler = createPipiliHandler();

export default async function pipiliChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handler(req, res);
}
