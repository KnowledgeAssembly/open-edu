import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'path';
import { expect, type Locator, type Page } from '@playwright/test';

export interface TestServer {
  url: string;
  close: () => Promise<void>;
}

export async function startServer(packageDir: string, port = 0): Promise<TestServer> {
  const resolvedPackageDir = resolve(packageDir);
  const devServerRoot = resolve('apps/dev-server');

  process.env.OPEN_EDU_PACKAGE_DIR = resolvedPackageDir;
  process.env.OPEN_EDU_STUDIO_MODE = 'developer';

  const server = await createServer({
    root: devServerRoot,
    server: { port, open: false, strictPort: false },
    logLevel: process.env.CI ? 'warn' : 'silent',
  });

  await server.listen();

  const address = server.resolvedUrls?.local?.[0];
  const url = address ?? `http://localhost:${port}`;

  return {
    url,
    close: async () => {
      await server.close();
    },
  };
}

export async function tabTo(page: Page, target: Locator) {
  await expect(async () => {
    await page.keyboard.press('Tab');
    await expect(target).toBeFocused({ timeout: 500 });
  }).toPass({ timeout: 15000 });
}
