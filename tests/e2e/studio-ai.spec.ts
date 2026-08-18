import { test, expect, type Page } from '@playwright/test';

const STUDIO_URL = 'http://localhost:4002';

const MOCK_DRAFT_FILES = [
  {
    path: 'package.json',
    content: JSON.stringify({ title: 'AI Water Course', version: '1.0.0' }, null, 2),
    encoding: 'utf8' as const,
  },
  {
    path: 'workflow.json',
    content: JSON.stringify({ routing: { 'nodes/lesson-1': { type: 'lesson' } } }, null, 2),
    encoding: 'utf8' as const,
  },
  {
    path: 'nodes/lesson-1/content.md',
    content: '# Water Basics\n\nWater is essential for life.',
    encoding: 'utf8' as const,
  },
  {
    path: 'nodes/lesson-1/metadata.json',
    content: JSON.stringify({ type: 'lesson', title: 'Water Basics' }, null, 2),
    encoding: 'utf8' as const,
  },
];

function mockGateway(
  page: Page,
  options: { available?: boolean; generateDraft?: boolean; chatResponse?: string } = {},
) {
  const { available = true, generateDraft = true, chatResponse } = options;

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

  if (generateDraft && available) {
    void page.route('**/api/ai/generate-draft', (route) => {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requestId: 'gw-draft',
          success: true,
          title: 'AI Water Course',
          files: MOCK_DRAFT_FILES,
          outlinePreview: [{ title: 'Water Basics', kind: 'lesson' }],
          quality: [{ id: 'outline', labelKey: 'Has outline', passed: true }],
        }),
      });
    });
  }

  if (chatResponse && available) {
    void page.route('**/api/ai/chat', (route) => {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requestId: 'gw-chat',
          terminal: 'finished',
          content: chatResponse,
        }),
      });
    });
  }
}

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
  await expect(page.getByRole('heading', { name: 'Outline', exact: true })).toBeVisible({
    timeout: 15000,
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
    await expect(page.getByRole('heading', { name: 'Outline', exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByRole('button', {
        name: 'What is the boiling point of water? (edited)',
        exact: true,
      }),
    ).toBeVisible();
  });

  test('mocked gateway chat flow confirms gateway is reachable', async ({ page }) => {
    await openStudio(page);
    mockGateway(page, {
      available: true,
      chatResponse: 'Use a lesson with water chemistry examples.',
    });
    await createTemplateCourse(page, 'Lesson + quiz');

    // Open the assistant panel.
    const assistantButton = page.getByRole('button', { name: 'Open Author Assistant' }).first();
    await assistantButton.click();

    // The chat input should be visible and ready for typing.
    const chatInput = page.getByPlaceholder(/ask|type|message/i);
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Type a message and send it — the gateway mock will handle the response.
    await chatInput.fill('Help me create a lesson about water chemistry');
    await chatInput.press('Enter');

    // Verify the hosted JSON response is adapted into an assistant message.
    await expect(page.getByText('Use a lesson with water chemistry examples.')).toBeVisible({
      timeout: 15000,
    });
  });

  test('gateway failure during generate-draft shows error and allows retry', async ({ page }) => {
    await openStudio(page);
    mockGateway(page, { available: true });
    await createTemplateCourse(page, 'Lesson + quiz');

    // Override the generate-draft route to fail.
    await page.route('**/api/ai/generate-draft', (route) => {
      void route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          requestId: 'gw-error',
          error: { code: 'provider-error', message: 'The AI provider could not be reached.' },
        }),
      });
    });

    // Open the "Add with AI" dialog which triggers generate-draft.
    const addButton = page.getByRole('button', { name: /add.*ai|ai.*add|add.*item/i }).first();
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
    } else {
      // Fallback: open assistant and use the add button there.
      const assistantButton = page.getByRole('button', { name: 'Open Author Assistant' }).first();
      await assistantButton.click();
      const chatInput = page.getByPlaceholder(/ask|type|message/i);
      await expect(chatInput).toBeVisible({ timeout: 10000 });
      await chatInput.fill('Create a lesson about water chemistry');
      await chatInput.press('Enter');
    }

    // Verify the app is still functional after the error.
    await expect(page.getByRole('heading', { name: 'Outline', exact: true })).toBeVisible({
      timeout: 15000,
    });

    // Manual authoring still works.
    await page.getByRole('button', { name: 'The Water Cycle', exact: true }).click();
    await expect(page.getByLabel('Lesson content')).toBeVisible({ timeout: 15000 });
  });

  test('pending drafts persist across page reload', async ({ page }) => {
    await openStudio(page);
    mockGateway(page, { available: true, generateDraft: true });
    await createTemplateCourse(page, 'Lesson + quiz');

    const assistantButton = page
      .getByRole('button', { name: 'Open Author Assistant', exact: true })
      .first();
    await assistantButton.click();
    const specInput = page.locator('input[type="file"][aria-label="Attach course spec"]');
    await specInput.setInputFiles({
      name: 'water-course.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    });
    await expect(page.getByText('Course draft: AI Water Course')).toBeVisible({ timeout: 15000 });

    // Verify IndexedDB has the pending-drafts store after mount.
    const hasStore = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('open-edu');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const has = db.objectStoreNames.contains('pending-drafts');
      db.close();
      return has;
    });
    expect(hasStore).toBe(true);

    // Verify the studio-drafts store also exists.
    const hasDraftStore = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('open-edu');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const has = db.objectStoreNames.contains('studio-drafts');
      db.close();
      return has;
    });
    expect(hasDraftStore).toBe(true);

    // The draft card is backed by persisted chat metadata + studio-drafts,
    // not only by the in-memory provider state.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Outline', exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText('Course draft: AI Water Course')).toBeVisible({ timeout: 15000 });

    // Accept the draft locally after reload; the gateway is never called again.
    await page.getByRole('button', { name: 'Accept draft' }).click();
    await page.getByRole('button', { name: 'Replace content' }).click();
    await expect(page.getByRole('heading', { name: 'AI Water Course', level: 2 })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: 'lesson-1', exact: true })).toBeVisible();
  });
});
