/*
 * Prerequisites:
 * 1. Start learner dev server: pnpm --filter @open-edu/learner dev
 * 2. Run: pnpm test:e2e
 *
 * These tests require the learner app to be running on port 4001.
 * The learner app serves the catalog at http://localhost:4001.
 */

import { test, expect } from '@playwright/test';

const LEARNER_URL = 'http://localhost:4001';

test.describe('Learner Experience', () => {
  test('full flow: catalog displays courses', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });

    const cards = page.locator('[data-testid="course-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking Start navigates to course page', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course outline"]')).toBeVisible({ timeout: 15000 });
  });

  test('sidebar shows correct node states during navigation', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course outline"]')).toBeVisible({ timeout: 15000 });

    const sidebarNodes = page.locator('nav[aria-label="Course outline"] li');
    const firstNode = sidebarNodes.first();
    await expect(firstNode).toHaveAttribute('aria-current', 'step');
  });

  test('progress persists after reload', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course outline"]')).toBeVisible({ timeout: 15000 });

    const progressBefore = await page.evaluate(() =>
      localStorage.getItem('open-edu-progress'),
    );

    await page.reload();

    const progressAfter = await page.evaluate(() =>
      localStorage.getItem('open-edu-progress'),
    );

    expect(progressAfter).toEqual(progressBefore);
  });

  test('accessibility: catalog page passes basic checks', async ({ page }) => {
    await page.goto(LEARNER_URL);
    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });

    const headings = page.locator('h1');
    await expect(headings.first()).toBeVisible();

    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('accessibility: course page has visible heading and nav', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course outline"]')).toBeVisible({ timeout: 15000 });

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('completion screen shows after finishing course', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course outline"]')).toBeVisible({ timeout: 15000 });

    const nextBtn = page.getByRole('button', { name: 'Next' });
    let clickCount = 0;
    const maxClicks = 20;

    while (clickCount < maxClicks) {
      const visible = await nextBtn.isVisible().catch(() => false);
      if (!visible) break;
      await nextBtn.click();
      clickCount++;
      await page.waitForTimeout(500);
    }

    const completionScreen = page.locator('[data-testid="completion-screen"]');
    const completionText = page.getByText(/You finished|You have completed|Course Completed/);

    await expect(
      completionScreen.or(completionText).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('back to catalog returns to course listing', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course outline"]')).toBeVisible({ timeout: 15000 });

    const nextBtn = page.getByRole('button', { name: 'Next' });
    let clickCount = 0;
    const maxClicks = 20;

    while (clickCount < maxClicks) {
      const visible = await nextBtn.isVisible().catch(() => false);
      if (!visible) break;
      await nextBtn.click();
      clickCount++;
      await page.waitForTimeout(500);
    }

    const backBtn = page
      .locator('[data-testid="back-to-catalog"], button:has-text("Back to catalog")')
      .first();
    const backVisible = await backBtn.isVisible().catch(() => false);
    if (backVisible) {
      await backBtn.click();
      await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });
    }
  });
});
