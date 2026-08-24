import { describe, it, expect, vi, beforeEach } from 'vitest';

interface MockedViteServer {
  listen: ReturnType<typeof vi.fn>;
  httpServer: { once: ReturnType<typeof vi.fn> };
  resolvedUrls: { local: string[] };
  close: ReturnType<typeof vi.fn>;
}

function createMockServer(): MockedViteServer {
  const once = vi.fn();
  return {
    listen: vi.fn().mockResolvedValue(undefined),
    httpServer: { once },
    resolvedUrls: { local: ['http://localhost:4000'] },
    close: vi.fn(),
  };
}

const mockCreateServer = vi.fn();

vi.mock('vite', () => ({
  createServer: mockCreateServer,
}));

const { startDevServer, DEV_SERVER_VERSION } = await import('./index');

describe('@open-edu/dev-server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export a version', () => {
    expect(DEV_SERVER_VERSION).toBe('0.1.0');
  });

  it('should start a vite dev server with the package dir', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);

    await startDevServer('/tmp/test-pkg');

    expect(mockCreateServer).toHaveBeenCalled();
    const opts = mockCreateServer.mock.calls[0][0];
    expect(opts.root).toContain('apps/dev-server');
    expect(opts.server.port).toBe(4000);
    expect(server.listen).toHaveBeenCalled();
  });

  it('should accept custom port option', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);

    await startDevServer('/tmp/test-pkg', { port: 5000, open: false });

    const opts = mockCreateServer.mock.calls[0][0];
    expect(opts.server.port).toBe(5000);
    expect(opts.server.open).toBe(false);
  });

  it('should set OPEN_EDU_PACKAGE_DIR env var', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);

    await startDevServer('/tmp/my-package');
    expect(process.env.OPEN_EDU_PACKAGE_DIR).toBe('/tmp/my-package');
  });

  it('should forward host option to vite server config', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);

    await startDevServer('/tmp/test-pkg', { host: '0.0.0.0' });

    const opts = mockCreateServer.mock.calls[0][0];
    expect(opts.server.host).toBe('0.0.0.0');
  });

  it('should not set host when option is absent', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);

    await startDevServer('/tmp/test-pkg');

    const opts = mockCreateServer.mock.calls[0][0];
    expect(opts.server.host).toBeUndefined();
  });

  it('should default open to false when host option is provided', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);

    await startDevServer('/tmp/test-pkg', { host: '0.0.0.0' });

    const opts = mockCreateServer.mock.calls[0][0];
    expect(opts.server.open).toBe(false);
  });

  it('should default open to false when OPEN_EDU_CONTAINER=1', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);
    process.env.OPEN_EDU_CONTAINER = '1';

    try {
      await startDevServer('/tmp/test-pkg');

      const opts = mockCreateServer.mock.calls[0][0];
      expect(opts.server.open).toBe(false);
    } finally {
      delete process.env.OPEN_EDU_CONTAINER;
    }
  });

  it('should keep browser-open enabled by default outside containers', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);
    delete process.env.OPEN_EDU_CONTAINER;

    await startDevServer('/tmp/test-pkg');

    const opts = mockCreateServer.mock.calls[0][0];
    expect(opts.server.open).toBe(true);
  });

  it('should let explicit open override container suppression', async () => {
    const server = createMockServer();
    server.httpServer.once.mockImplementation((_event: string, cb: () => void) => {
      setTimeout(cb, 5);
    });
    mockCreateServer.mockResolvedValue(server);
    process.env.OPEN_EDU_CONTAINER = '1';

    try {
      await startDevServer('/tmp/test-pkg', { open: true });

      const opts = mockCreateServer.mock.calls[0][0];
      expect(opts.server.open).toBe(true);
    } finally {
      delete process.env.OPEN_EDU_CONTAINER;
    }
  });
});
