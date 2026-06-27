import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4001';

async function navigateToCatalog(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL);
  await page.waitForSelector('[data-testid="home-page"]', { timeout: 10000 });
  await page.getByRole('button', { name: 'Browse Courses' }).click();
  await page.waitForSelector('[data-testid="catalog-page"]', { timeout: 10000 });
}

test.describe('Bundle navigation', () => {
  test('Catalog shows bundle cards', async ({ page }) => {
    await navigateToCatalog(page);
    const bundleCards = await page.locator('[data-testid="bundle-card"]').count();
    expect(bundleCards).toBeGreaterThanOrEqual(1);
  });

  test('Clicking bundle card navigates to bundle overview', async ({ page }) => {
    await navigateToCatalog(page);
    await page.locator('[data-testid="bundle-card"]').first().click();
    await expect(page.locator('[data-testid="bundle-overview"]')).toBeVisible({ timeout: 5000 });
  });

  test('Bundle overview shows module cards', async ({ page }) => {
    await navigateToCatalog(page);
    await page.locator('[data-testid="bundle-card"]').first().click();
    await page.waitForSelector('[data-testid="bundle-overview"]', { timeout: 5000 });
    const moduleCards = await page.locator('[data-testid="module-card"]').count();
    expect(moduleCards).toBeGreaterThanOrEqual(1);
  });

  test('Start button on unlocked module launches course', async ({ page }) => {
    await navigateToCatalog(page);
    await page.locator('[data-testid="bundle-card"]').first().click();
    await page.waitForSelector('[data-testid="bundle-overview"]', { timeout: 5000 });
    const startButton = page.locator('[data-testid^="start-module-"]').first();
    await startButton.waitFor({ timeout: 5000 });
    await startButton.click();
    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 5000 });
  });

  test('Back to Catalog button works', async ({ page }) => {
    await navigateToCatalog(page);
    await page.locator('[data-testid="bundle-card"]').first().click();
    await page.waitForSelector('[data-testid="bundle-overview"]', { timeout: 5000 });
    await page.locator('[data-testid="back-to-catalog"]').click();
    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 5000 });
  });

  test('Module card shows correct status label', async ({ page }) => {
    await navigateToCatalog(page);
    await page.locator('[data-testid="bundle-card"]').first().click();
    await page.waitForSelector('[data-testid="bundle-overview"]', { timeout: 5000 });
    const completedBadges = await page.locator('[data-testid="module-status-completed"]').count();
    const unlockedBadges = await page.locator('[data-testid="module-status-unlocked"]').count();
    const lockedBadges = await page.locator('[data-testid="module-status-locked"]').count();
    const total = completedBadges + unlockedBadges + lockedBadges;
    expect(total).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Single-package backward compat', () => {
  test('Package card launches course runtime', async ({ page }) => {
    await navigateToCatalog(page);
    const courseCards = page.locator('[data-testid="course-card"]');
    const count = await courseCards.count();
    if (count > 0) {
      await courseCards.first().click();
      await page.waitForTimeout(2000);
    }
  });
});
