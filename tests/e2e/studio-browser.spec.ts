import { test, expect, type Page } from '@playwright/test';

const STUDIO_URL = 'http://localhost:4002';

const EDITED_QUESTION = 'What is the boiling point of water? (edited)';

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

test.describe('Browser Studio (Phase 1)', () => {
  test('create template → edit → reload → export → import → preview', async ({ page }) => {
    // 1. Open the browser build.
    await openStudio(page);

    // 2. Create a template course (Lesson + quiz).
    await createTemplateCourse(page, 'Lesson + quiz');

    const lessonRow = page.getByRole('button', { name: 'The Water Cycle', exact: true });
    const quizRow = page.getByRole('button', { name: 'The Water Cycle Check', exact: true });
    const editedQuizRow = page.getByRole('button', { name: EDITED_QUESTION, exact: true });
    await expect(lessonRow).toBeVisible();
    await expect(quizRow).toBeVisible();

    // 3. Edit the first activity (lesson).
    await lessonRow.click();
    await expect(page.getByLabel('Lesson content')).toBeVisible({ timeout: 15000 });
    await page
      .getByLabel('Lesson content')
      .fill('# The Water Cycle\n\nWater moves through three main states.');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Back' }).click();

    // Edit the second activity (quiz). The quiz editor serializes without a
    // title, so the outline shows the edited question as its label.
    await expect(quizRow).toBeVisible();
    await quizRow.click();
    await expect(page.getByLabel('Question')).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Question').fill(EDITED_QUESTION);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('button', { name: EDITED_QUESTION, exact: true })).toBeVisible();

    // 4. Reload and confirm persistence.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Outline' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'The Water Cycle', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: EDITED_QUESTION, exact: true })).toBeVisible();

    // 5. Validate and export .oep.
    await page.getByRole('banner').getByRole('button', { name: 'Share' }).click();
    await expect(page.getByRole('heading', { name: 'Share this course' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ready check' })).toBeVisible({
      timeout: 15000,
    });
    const exportButton = page.getByRole('button', { name: 'Export .oep file' });
    await expect(exportButton).toBeEnabled({ timeout: 15000 });
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('lesson-quiz-1.0.0.oep');
    const oepPath = await download.path();
    expect(oepPath).toBeTruthy();

    // 6. Import the exported .oep under the same course id.
    await page.getByRole('button', { name: 'My courses' }).first().click();
    await expect(page.getByRole('heading', { name: 'My courses', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Import' }).click();
    const importInput = page.getByTestId('import-oep-input');
    await expect(importInput).toBeVisible();
    await importInput.setInputFiles(oepPath!);
    await expect(page.getByRole('heading', { name: 'My courses', level: 1 })).toBeVisible({
      timeout: 15000,
    });

    // 7. Confirm the re-imported course keeps both activities (files preserved).
    await page.getByRole('button', { name: 'Open', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Outline' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'The Water Cycle', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: EDITED_QUESTION, exact: true })).toBeVisible();

    // 8. Open the preview and complete the first activity.
    await page.getByRole('banner').getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(EDITED_QUESTION)).toBeVisible({ timeout: 10000 });
  });

  test('reports the local-storage notice in browser mode', async ({ page }) => {
    await openStudio(page);
    await expect(page.getByText(/stored in this browser only/i)).toBeVisible();
  });
});
