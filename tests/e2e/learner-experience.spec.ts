/*
 * Prerequisites:
 * 1. Start learner dev server: pnpm --filter @open-edu/learner dev
 * 2. Run: pnpm test:e2e
 *
 * These tests require the learner app to be running on port 4001.
 * The learner app serves the catalog at http://localhost:4001.
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

async function navigateThroughCourse(page: Page, maxSteps = 30): Promise<void> {
  for (let step = 0; step < maxSteps; step++) {
    const nextBtn = page.locator('[data-testid="layout-shell-next"]');
    if (!(await nextBtn.isVisible().catch(() => false))) {
      const backBtn = page.locator('[data-testid="layout-shell-back"]');
      if (await backBtn.isVisible().catch(() => false)) {
        break;
      }
      // Wait for Next button or break if we're at the end
      await page.waitForTimeout(1000);
      if (!(await nextBtn.isVisible().catch(() => false))) break;
    }
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
      await page.waitForTimeout(1000);
    }
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(800);
    }
  }
}

test.describe('Learner Experience', () => {
  test('full flow: catalog displays courses', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await expect(page.locator('[data-testid="home-page"]')).toBeVisible({ timeout: 10000 });

    await navigateToCatalog(page);

    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });

    const cards = page.locator('[data-testid="course-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking Start navigates to course page', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);

    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="layout-shell"]')).toBeVisible({ timeout: 10000 });
  });

  test('course step list shows steps on course start', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);

    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });

    const stepList = page.locator('[data-testid="course-step-list"]');
    await expect(stepList).toBeVisible({ timeout: 10000 });

    const stepButtons = page.locator('[data-testid^="step-"]');
    await expect(stepButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test('progress persists after reload', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);

    await expect(page.locator('[data-testid="layout-shell"]')).toBeVisible({ timeout: 15000 });

    const progressBefore = await page.evaluate(() => localStorage.getItem('open-edu-progress'));

    await page.reload();

    const progressAfter = await page.evaluate(() => localStorage.getItem('open-edu-progress'));

    // Compare progress data excluding updatedAt (which changes on re-mount)
    const stripTimestamps = (raw: string | null) => {
      if (!raw) return raw;
      const parsed = JSON.parse(raw);
      for (const id of Object.keys(parsed)) {
        const { updatedAt, ...rest } = parsed[id];
        parsed[id] = rest;
      }
      return JSON.stringify(parsed);
    };
    expect(stripTimestamps(progressAfter)).toEqual(stripTimestamps(progressBefore));
  });

  test('accessibility: catalog page passes basic checks', async ({ page }) => {
    await page.goto(LEARNER_URL);
    await navigateToCatalog(page);

    await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible({ timeout: 10000 });

    const headings = page.locator('h1');
    await expect(headings.first()).toBeVisible();

    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('accessibility: course page has visible heading and nav', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);

    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({ timeout: 10000 });

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('user can navigate through all course lessons', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);

    await expect(page.locator('[data-testid="course-runtime"]')).toBeVisible({ timeout: 15000 });

    await navigateThroughCourse(page);

    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({ timeout: 10000 });
  });

  test('navigation between steps works', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await startFirstCourse(page);

    await expect(page.locator('[data-testid="layout-shell"]')).toBeVisible({ timeout: 15000 });

    const nextBtn = page.locator('[data-testid="layout-shell-next"]');
    await expect(nextBtn).toBeVisible({ timeout: 10000 });
    await expect(nextBtn).toBeEnabled({ timeout: 10000 });

    await nextBtn.click();
    await page.waitForTimeout(800);

    const stepButtons = page.locator('[data-testid^="step-"]');
    await expect(stepButtons.first()).toBeVisible({ timeout: 10000 });
  });
});
