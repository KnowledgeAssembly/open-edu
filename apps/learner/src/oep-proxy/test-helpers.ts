import type { oepProxyHandler } from './index.js';

export function createMockRes() {
  const chunks: Uint8Array[] = [];
  const headers: Record<string, string> = {};
  let headersSent = false;
  let writableEnded = false;
  return {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    write(chunk: Uint8Array): boolean {
      headersSent = true;
      chunks.push(chunk);
      return true;
    },
    end(chunk?: Uint8Array | string): void {
      headersSent = true;
      writableEnded = true;
      if (chunk) {
        chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
      }
    },
    get headersSent() {
      return headersSent;
    },
    get writableEnded() {
      return writableEnded;
    },
    get headers() {
      return headers;
    },
    get body(): string {
      const total = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      return new TextDecoder().decode(merged);
    },
  };
}

export function mockRequest(url: string, method = 'GET') {
  return { method, url } as unknown as Parameters<typeof oepProxyHandler>[0];
}
