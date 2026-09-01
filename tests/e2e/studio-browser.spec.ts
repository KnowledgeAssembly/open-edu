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
    // Canonical content now lives in OPFS (not the IndexedDB studio-courses
    // record), so the fixture is written directly into the workspace.
    await page.evaluate(async () => {
      const writeRecursive = async (
        dir: FileSystemDirectoryHandle,
        segments: string[],
        bytes: Uint8Array,
      ): Promise<void> => {
        if (segments.length === 1) {
          const file = await dir.getFileHandle(segments[0]!, { create: true });
          const writable = await file.createWritable();
          await writable.write(bytes);
          await writable.close();
          return;
        }
        const next = await dir.getDirectoryHandle(segments[0]!, { create: true });
        await writeRecursive(next, segments.slice(1), bytes);
      };
      const root = await navigator.storage.getDirectory();
      const openedu = await root.getDirectoryHandle('openedu', { create: true });
      const courses = await openedu.getDirectoryHandle('courses', { create: true });
      const course = await courses.getDirectoryHandle('lesson-quiz', { create: true });
      await writeRecursive(
        course,
        ['assets', 'notes.txt'],
        new TextEncoder().encode('unknown text'),
      );
      await writeRecursive(
        course,
        ['assets', 'diagram.png'],
        new Uint8Array([137, 80, 78, 71, 1, 2, 3]),
      );
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
      const readRecursive = async (
        dir: FileSystemDirectoryHandle,
        prefix: string,
        out: Array<{ path: string; bytes: number[] }>,
      ): Promise<void> => {
        for await (const [name, handle] of dir.entries()) {
          const path = prefix ? `${prefix}/${name}` : name;
          if (handle.kind === 'directory') {
            await readRecursive(handle as FileSystemDirectoryHandle, path, out);
            continue;
          }
          const file = await (handle as FileSystemFileHandle).getFile();
          out.push({ path, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) });
        }
      };
      const root = await navigator.storage.getDirectory();
      const openedu = await root.getDirectoryHandle('openedu');
      const courses = await openedu.getDirectoryHandle('courses');
      const course = await courses.getDirectoryHandle('lesson-quiz-imported');
      const out: Array<{ path: string; bytes: number[] }> = [];
      await readRecursive(course, '', out);
      return out;
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
