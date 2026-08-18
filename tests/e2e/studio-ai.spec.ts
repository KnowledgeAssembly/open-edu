import { test, expect, type Page } from '@playwright/test';

const STUDIO_URL = 'http://localhost:4002';

async function openStudio(page: Page): Promise<void> {
  await page.goto(STUDIO_URL);
  await expect(page.getByRole('heading', { name: 'Create a course' })).toBeVisible({
    timeout: 30000,
  });
}

async function createTemplateCourse(page: Page, templateName: string): Promise<void> {
  await page.getByRole('button', { name: templateName }).click();
  await page.getByRole('button', { name: 'Use template' }).click();
  await page.getByRole('button', { name: 'Replace and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Outline' })).toBeVisible({ timeout: 15000 });
}

function mockGateway(page: Page, options: { available?: boolean } = {}) {
  const { available = true } = options;
  void page.route('**/api/ai/status', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        requestId: 'gw-status',
        available,
        reason: available ? undefined : 'missing-key',
      }),
    });
  });
}

test.describe('Browser Studio AI (Phase 2)', () => {
  test('manual authoring continues to work when the gateway is unavailable', async ({ page }) => {
    await openStudio(page);
    mockGateway(page, { available: false });
    await createTemplateCourse(page, 'Lesson + quiz');

    // Edit an activity to prove authoring is unaffected by AI unavailability.
    await page.getByRole('button', { name: 'The Water Cycle', exact: true }).click();
    await expect(page.getByLabel('Lesson content')).toBeVisible({ timeout: 15000 });
    await page
      .getByLabel('Lesson content')
      .fill('# The Water Cycle\n\nEdited while AI is unavailable.');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Back' }).click();

    // Export still works.
    await page.getByRole('banner').getByRole('button', { name: 'Share' }).click();
    await expect(page.getByRole('heading', { name: 'Share this course' })).toBeVisible();
    const exportButton = page.getByRole('button', { name: 'Export .oep file' });
    await expect(exportButton).toBeEnabled({ timeout: 15000 });
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('lesson-quiz-1.0.0.oep');
  });

  test('browser Studio authoring works with the gateway available', async ({ page }) => {
    await openStudio(page);
    mockGateway(page, { available: true });
    await createTemplateCourse(page, 'Lesson + quiz');

    // Edit the quiz activity to prove the app remains fully functional.
    await page.getByRole('button', { name: 'The Water Cycle Check', exact: true }).click();
    await expect(page.getByLabel('Question')).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Question').fill('What is the boiling point of water? (edited)');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Back' }).click();

    await expect(
      page.getByRole('button', {
        name: 'What is the boiling point of water? (edited)',
        exact: true,
      }),
    ).toBeVisible();

    // Reload — edits persist in browser storage.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Outline' })).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole('button', {
        name: 'What is the boiling point of water? (edited)',
        exact: true,
      }),
    ).toBeVisible();
  });
});
