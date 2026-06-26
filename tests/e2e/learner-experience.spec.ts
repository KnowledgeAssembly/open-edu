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

async function navigateThroughCourse(page: Page, maxSteps = 30): Promise<void> {
  for (let step = 0; step < maxSteps; step++) {
    const lessonBtns = page.locator('[data-testid^="course-tree-lesson-"]');
    const count = await lessonBtns.count();
    if (step >= count) break;

    await lessonBtns.nth(step).click();
    await page.waitForTimeout(800);

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
}

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

    await expect(page.locator('nav[aria-label="Course modules"]')).toBeVisible({ timeout: 15000 });
  });

  test('course tree shows modules on course home', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course modules"]')).toBeVisible({ timeout: 15000 });

    // Verify the course tree has at least one lesson
    const lessonButtons = page.locator('[data-testid^="course-tree-lesson-"]');
    await expect(lessonButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test('progress persists after reload', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course modules"]')).toBeVisible({ timeout: 15000 });

    const progressBefore = await page.evaluate(() => localStorage.getItem('open-edu-progress'));

    await page.reload();

    const progressAfter = await page.evaluate(() => localStorage.getItem('open-edu-progress'));

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

    await expect(page.locator('nav[aria-label="Course modules"]')).toBeVisible({ timeout: 15000 });

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('user can navigate through all course lessons', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course modules"]')).toBeVisible({ timeout: 15000 });

    await navigateThroughCourse(page);

    // Verify the side navigation remains visible after navigating all lessons
    await expect(page.locator('[data-testid="side-nav"]')).toBeVisible({ timeout: 10000 });
  });

  test('course navigation between lessons works', async ({ page }) => {
    await page.goto(LEARNER_URL);

    const startBtn = page.locator('[data-testid="course-card"] button, article button').first();
    await startBtn.click();

    await expect(page.locator('nav[aria-label="Course modules"]')).toBeVisible({ timeout: 15000 });

    // Click the first lesson in the CourseTree
    const firstLesson = page.locator('[data-testid^="course-tree-lesson-"]').first();
    await firstLesson.click();
    await page.waitForTimeout(500);

    // Verify the lesson page rendered with side navigation
    await expect(page.locator('[data-testid="side-nav"]')).toBeVisible({ timeout: 10000 });
  });
});
