import type { IncomingMessage, ServerResponse } from 'http';
import { handleDictionaryRequest } from './dictionary-server.js';

export default async function dictionaryHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  handleDictionaryRequest(req, res);
}
