import { test, expect } from '@playwright/test';
import { resolve, join } from 'path';
import { mkdtempSync, writeFileSync, readFileSync, cpSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { startServer, openStudioPreview, type TestServer } from './helpers';

test.describe('hot reload preserves state', () => {
  let server: TestServer;
  let tmpPkgDir: string;
  const HELLO_WORLD_SRC = resolve('examples/hello-world');

  test.beforeAll(async () => {
    tmpPkgDir = mkdtempSync(join(tmpdir(), 'edu-hmr-test-'));
    cpSync(HELLO_WORLD_SRC, tmpPkgDir, { recursive: true });
    server = await startServer(tmpPkgDir);
  });

  test.afterAll(async () => {
    await server.close();
    rmSync(tmpPkgDir, { recursive: true, force: true });
  });

  test('preserves node state after markdown edit', async ({ page }) => {
    await page.goto(server.url);
    await openStudioPreview(page);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();

    const mdPath = join(tmpPkgDir, 'nodes', 'hello.md');
    const original = readFileSync(mdPath, 'utf-8');
    writeFileSync(mdPath, original + '\n\n', 'utf-8');

    await page.waitForTimeout(1000);

    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });

  test('preserves node state after JSON edit', async ({ page }) => {
    await page.goto(server.url);
    await openStudioPreview(page);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();

    const pkgPath = join(tmpPkgDir, 'package.json');
    const original = readFileSync(pkgPath, 'utf-8');
    writeFileSync(pkgPath, original.trimEnd() + '\n', 'utf-8');

    await page.waitForTimeout(1000);

    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });
});
