/*
 * Prerequisites:
 * 1. Start learner dev server: pnpm --filter @open-edu/learner dev
 * 2. Run: pnpm test:e2e -- course-reset
 *
 * These tests require the learner app to be running on port 4001.
 */

import { test, expect, type Page } from '@playwright/test';

const LEARNER_URL = 'http://localhost:4001';

async function navigateToCatalog(page: Page): Promise<void> {
  const browseBtn = page.getByText('Browse Courses');
  if (await browseBtn.isVisible().catch(() => false)) {
    await browseBtn.click();
  } else {
    const catalogNav = page.locator('[data-testid="appsidebar-nav-catalog"]');
    if (await catalogNav.isVisible().catch(() => false)) {
      await catalogNav.click();
    }
  }
}

async function startFirstCourse(page: Page): Promise<void> {
  await navigateToCatalog(page);
  await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });
  const card = page.locator('[data-testid="course-card"]').first();
  await expect(card).toBeVisible({ timeout: 10000 });
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
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);
    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });

    // Navigate a few steps to create progress
    await navigateThroughSteps(page, 2);

    // Go back to catalog
    const backBtn = page.locator('[data-testid="app-sidebar"]').getByText('Back to Catalog');
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
    } else {
      await page.goto(`${LEARNER_URL}/catalog`);
    }

    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });

    // Hover over a course card to reveal the reset button
    const courseCard = page.locator('[data-testid="course-card"]').first();
    await courseCard.hover();

    // The RotateCcw reset button should now be visible
    const resetButton = courseCard
      .locator('xpath=../../..')
      .locator('button')
      .filter({ has: page.locator('svg.lucide-rotate-ccw') });
    await expect(resetButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('reset confirmation dialog opens and can be cancelled', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);
    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });

    await navigateThroughSteps(page, 2);

    // Go back to catalog
    await page.goto(`${LEARNER_URL}/catalog`);
    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });

    // Hover and find reset button
    const courseCard = page.locator('[data-testid="course-card"]').first();
    await courseCard.hover();

    const resetButton = courseCard
      .locator('xpath=../../..')
      .locator('button')
      .filter({ has: page.locator('svg.lucide-rotate-ccw') });
    await resetButton.first().click();

    // Confirmation dialog should appear
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });

    // Cancel
    await page.getByTestId('reset-cancel-button').click();

    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('reset confirmation can be confirmed', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);
    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });

    await navigateThroughSteps(page, 2);

    // Go back to catalog
    await page.goto(`${LEARNER_URL}/catalog`);
    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });

    // Hover and find reset button
    const courseCard = page.locator('[data-testid="course-card"]').first();
    await courseCard.hover();

    const resetButton = courseCard
      .locator('xpath=../../..')
      .locator('button')
      .filter({ has: page.locator('svg.lucide-rotate-ccw') });
    await resetButton.first().click();

    // Confirm reset
    await page.getByTestId('reset-confirm-button').click();

    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 });

    // Course should no longer be in "Continue Learning" shelf
    await expect(page.locator('[data-testid="continue-learning-shelf"]')).not.toBeVisible({
      timeout: 5000,
    });
  });
});
