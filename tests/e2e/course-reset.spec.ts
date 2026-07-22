/*
 * Prerequisites:
 * 1. Start learner dev server: pnpm --filter @open-edu/learner dev
 * 2. Run: pnpm test:e2e -- course-reset
 *
 * These tests require the learner app to be running on port 4001.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4001';

async function goToCatalog(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.waitForSelector('[data-testid="home-page"]', { timeout: 10000 });
  await page.getByRole('button', { name: 'Browse Courses' }).click();
  await page.waitForSelector('[data-testid="catalog-page"]', { timeout: 10000 });
}

async function startFirstCourse(page: Page): Promise<void> {
  await goToCatalog(page);
  const card = page.locator('[data-testid="course-card"]').first();
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await card.click();
}

async function navigateThroughSteps(page: Page, steps = 3): Promise<void> {
  for (let i = 0; i < steps; i++) {
    const nextBtn = page.locator('[data-testid="layout-shell-next"]');
    if (!(await nextBtn.isVisible().catch(() => false))) break;
    if (!(await nextBtn.isEnabled().catch(() => false))) {
      const submitBtn = page.getByRole('button', { name: 'Submit' });
      if (await submitBtn.isVisible().catch(() => false)) {
        const radio = page.locator('input[type="radio"]').first();
        if (await radio.isVisible().catch(() => false)) {
          await radio.check();
          await page.waitForTimeout(200);
        }
        if (await submitBtn.isEnabled().catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
    if (
      (await nextBtn.isVisible().catch(() => false)) &&
      (await nextBtn.isEnabled().catch(() => false))
    ) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
  }
}

test.describe('Course Reset', () => {
  test('reset button appears on hover for courses with progress', async ({ page }) => {
    await goToCatalog(page);

    await startFirstCourse(page);
    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });

    await navigateThroughSteps(page, 2);

    // Return to catalog via full page navigation
    await goToCatalog(page);

    // Hover over a course card to reveal the reset button
    const courseCard = page.locator('[data-testid="course-card"]').first();
    await courseCard.hover();

    const resetButton = page.getByTestId('reset-button').first();
    await expect(resetButton).toBeVisible({ timeout: 5000 });
  });

  test('reset confirmation dialog opens and can be cancelled', async ({ page }) => {
    await goToCatalog(page);

    await startFirstCourse(page);
    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });

    await navigateThroughSteps(page, 2);

    await goToCatalog(page);

    // Hover and find reset button
    const courseCard = page.locator('[data-testid="course-card"]').first();
    await courseCard.hover();

    const resetButton = page.getByTestId('reset-button').first();
    await expect(resetButton).toBeVisible({ timeout: 5000 });
    await resetButton.click();

    // Confirmation dialog should appear
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });

    // Cancel
    await page.getByTestId('reset-cancel-button').click();

    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('reset confirmation removes course from progress', async ({ page }) => {
    await goToCatalog(page);

    await startFirstCourse(page);
    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });

    await navigateThroughSteps(page, 2);

    await goToCatalog(page);

    // Hover and find reset button
    const courseCard = page.locator('[data-testid="course-card"]').first();
    await courseCard.hover();

    const resetButton = page.getByTestId('reset-button').first();
    await expect(resetButton).toBeVisible({ timeout: 5000 });
    await resetButton.click();

    // Confirm reset
    await page.getByTestId('reset-confirm-button').click();

    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 });

    // Navigate to progress page and verify the course is no longer listed
    await page.goto(`${BASE_URL}/progress`);
    await page.waitForSelector('[data-testid="progress-dashboard"]', { timeout: 10000 });

    // The reset course should not appear in progress
    const progressButtons = page.getByTestId('reset-button');
    await expect(progressButtons).toHaveCount(0, { timeout: 5000 });
  });
});
