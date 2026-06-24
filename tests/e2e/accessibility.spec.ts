import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { startServer, type TestServer } from './helpers';

const AUTISM = resolve('examples/autism-reading');
const HELLO_WORLD = resolve('examples/hello-world');

test.describe('keyboard navigation', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(HELLO_WORLD);
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('Next button receives focus via Tab', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(1000);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const nextButton = page.getByRole('button', { name: 'Next' });
    await expect(nextButton).toBeFocused();
  });

  test('activates Next button with keyboard Enter', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(1000);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });
});

test.describe('accessibility validation', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(AUTISM);
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('page has proper landmark regions', async ({ page }) => {
    await page.goto(server.url);

    const shell = page.getByTestId('layout-shell');
    await expect(shell).toBeVisible();

    const main = page.locator('main[aria-live="polite"]');
    await expect(main).toBeVisible();
  });

  test('inspector panel has complementary role', async ({ page }) => {
    await page.goto(server.url);

    const inspector = page.getByRole('complementary', { name: 'Developer inspector panel' });
    await expect(inspector).toBeVisible();
  });

  test('A11y inspector shows no violations after auto-audit', async ({ page }) => {
    await page.goto(server.url);

    await page.getByRole('button', { name: 'A11y' }).click();

    await expect(page.getByText('No accessibility violations found')).toBeVisible({
      timeout: 15000,
    });
  });

  test('Run Audit button is present and clickable', async ({ page }) => {
    await page.goto(server.url);

    await page.getByRole('button', { name: 'A11y' }).click();

    await expect(page.getByText('No accessibility violations found')).toBeVisible({
      timeout: 15000,
    });

    const runButton = page.getByRole('button', { name: /Run Audit|Running/ });
    await expect(runButton).toBeVisible();
    await runButton.click();
  });
});
