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

export async function openStudioPreview(page: Page): Promise<void> {
  const previewNav = page.getByRole('button', { name: /^preview$/i });
  await previewNav.click();
  await expect(page.getByRole('button', { name: /exit preview/i })).toBeVisible({ timeout: 15000 });
}

export async function openPreviewDevtools(page: Page): Promise<void> {
  await openStudioPreview(page);
  await page.getByRole('button', { name: /open devtools/i }).click();
  await expect(page.getByRole('complementary', { name: /preview devtools/i })).toBeVisible();
}
