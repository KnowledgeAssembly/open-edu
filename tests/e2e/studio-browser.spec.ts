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

    // Add files the editor does not expose so the browser persistence and
    // archive flow can prove that unknown text and binary assets survive.
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('open-edu', 5);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('studio-courses', 'readwrite');
        const store = transaction.objectStore('studio-courses');
        const getRequest = store.get('lesson-quiz');
        getRequest.onsuccess = () => {
          const course = getRequest.result as {
            files: Array<{ path: string; data: ArrayBuffer }>;
          };
          course.files.push(
            { path: 'assets/notes.txt', data: new TextEncoder().encode('unknown text').buffer },
            { path: 'assets/diagram.png', data: new Uint8Array([137, 80, 78, 71, 1, 2, 3]).buffer },
          );
          store.put(course);
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    });

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

    // 6. Import the exported .oep. A colliding ID receives a new browser ID.
    await page.getByRole('button', { name: 'My courses' }).first().click();
    await expect(page.getByRole('heading', { name: 'My courses', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Import' }).click();
    const importInput = page.getByTestId('import-oep-input');
    await expect(importInput).toBeVisible();
    await importInput.setInputFiles(oepPath!);
    await expect(page.getByRole('heading', { name: 'My courses', level: 1 })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('lesson-quiz-imported')).toBeVisible();

    const importedFiles = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('open-edu', 5);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const course = await new Promise<{
        files: Array<{ path: string; data: ArrayBuffer }>;
      }>((resolve, reject) => {
        const request = db
          .transaction('studio-courses')
          .objectStore('studio-courses')
          .get('lesson-quiz-imported');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return course.files.map((file) => ({
        path: file.path,
        bytes: Array.from(new Uint8Array(file.data)),
      }));
    });
    expect(importedFiles.find((file) => file.path === 'assets/notes.txt')?.bytes).toEqual(
      Array.from(new TextEncoder().encode('unknown text')),
    );
    expect(importedFiles.find((file) => file.path === 'assets/diagram.png')?.bytes).toEqual([
      137, 80, 78, 71, 1, 2, 3,
    ]);

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
