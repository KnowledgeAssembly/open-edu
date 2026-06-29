import { test, expect } from '@playwright/test';

const LEARNER_URL = 'http://localhost:4001';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LEARNER_URL);
    await expect(page.locator('[data-testid="home-page"]')).toBeVisible({ timeout: 10000 });
    // Navigate to Settings page where the ThemeSelector lives
    const settingsNav = page.locator('[data-testid="appsidebar-nav-settings"]');
    await settingsNav.click();
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10000 });
  });

  test('default theme is Lumina Scholastica', async ({ page }) => {
    await expect(page.locator('.open-edu-runtime')).toHaveAttribute(
      'data-theme',
      'lumina-scholastica',
    );
  });

  test('theme selector trigger is visible on settings page', async ({ page }) => {
    const trigger = page.locator('[data-testid="theme-selector-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 5000 });
    await expect(trigger).toHaveAttribute('aria-label', 'Select theme');
  });

  test('switching to Nocturnal changes data-theme attribute', async ({ page }) => {
    const trigger = page.locator('[data-testid="theme-selector-trigger"]');
    await trigger.click();
    await expect(page.locator('[data-testid="theme-selector-popover"]')).toBeVisible();

    await page.locator('[data-testid="theme-card-nocturnal"]').click();

    await expect(page.locator('.open-edu-runtime')).toHaveAttribute('data-theme', 'nocturnal');

    await expect(page.locator('[data-testid="theme-selector-popover"]')).not.toBeVisible();
  });

  test('theme persists after page reload', async ({ page }) => {
    const trigger = page.locator('[data-testid="theme-selector-trigger"]');
    await trigger.click();
    await page.locator('[data-testid="theme-card-nocturnal"]').click();
    await expect(page.locator('.open-edu-runtime')).toHaveAttribute('data-theme', 'nocturnal');

    await page.reload();
    await expect(page.locator('.open-edu-runtime')).toHaveAttribute('data-theme', 'nocturnal', {
      timeout: 10000,
    });
  });

  test('switching to High Focus applies correct data-theme', async ({ page }) => {
    const trigger = page.locator('[data-testid="theme-selector-trigger"]');
    await trigger.click();
    await page.locator('[data-testid="theme-card-high-focus"]').click();
    await expect(page.locator('.open-edu-runtime')).toHaveAttribute('data-theme', 'high-focus');
  });

  test('switching to Sylvan Workspace applies correct data-theme', async ({ page }) => {
    const trigger = page.locator('[data-testid="theme-selector-trigger"]');
    await trigger.click();
    await page.locator('[data-testid="theme-card-sylvan-workspace"]').click();
    await expect(page.locator('.open-edu-runtime')).toHaveAttribute(
      'data-theme',
      'sylvan-workspace',
    );
  });

  test('ThemeSelector popover can be opened and closed', async ({ page }) => {
    const trigger = page.locator('[data-testid="theme-selector-trigger"]');

    await trigger.click();
    await expect(page.locator('[data-testid="theme-selector-popover"]')).toBeVisible();

    await trigger.click();
    await expect(page.locator('[data-testid="theme-selector-popover"]')).not.toBeVisible();
  });

  test('all theme cards are present in popover', async ({ page }) => {
    const trigger = page.locator('[data-testid="theme-selector-trigger"]');
    await trigger.click();

    const expectedThemes = [
      'lumina-scholastica',
      'high-focus',
      'nocturnal',
      'sylvan-workspace',
    ] as const;

    for (const id of expectedThemes) {
      await expect(page.locator(`[data-testid="theme-card-${id}"]`)).toBeVisible();
    }
  });
});
