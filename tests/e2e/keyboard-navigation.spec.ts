import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { startServer, tabTo, type TestServer } from './helpers';

const HELLO_WORLD = resolve('examples/hello-world');
const FRACTIONS = resolve('examples/fractions');

test.describe('keyboard navigation - hello-world', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(HELLO_WORLD);
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('can navigate to Next button and activate with Enter', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);

    const nextButton = page.getByRole('button', { name: 'Next' });
    await tabTo(page, nextButton);
    await expect(nextButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });

  test('completion heading is visible after keyboard navigation', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);

    const nextButton = page.getByRole('button', { name: 'Next' });
    await tabTo(page, nextButton);
    await nextButton.press('Enter');
    await page.waitForTimeout(500);

    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('Escape does not trap user', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });
});

test.describe('keyboard navigation - fractions (conditional branching)', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(FRACTIONS);
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('can navigate quiz options and submit with keyboard', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);

    const nextButton = page.getByRole('button', { name: 'Next' });
    await tabTo(page, nextButton);
    await nextButton.press('Enter');
    await page.waitForTimeout(500);

    await page.keyboard.press('Space');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    await expect(page.getByText('Great work! You have a solid understanding')).toBeVisible();
  });

  test('Escape does not trap user on quiz', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);

    const nextButton = page.getByRole('button', { name: 'Next' });
    await tabTo(page, nextButton);
    await nextButton.press('Enter');
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await expect(page.getByText('Which statements about fractions are correct?')).toBeVisible();
  });
});
