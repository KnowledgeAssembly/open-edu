/*
 * Prerequisites:
 * 1. Start learner dev server: pnpm --filter @open-edu/learner dev
 * 2. Run: pnpm test:e2e
 *
 * These tests require the learner app to be running on port 4001.
 * Tests are sequential (shared note state via localStorage).
 */

import { test, expect } from '@playwright/test';

const LEARNER_URL = 'http://localhost:4001';

test.describe.serial('Notes Feature', () => {
  let noteId = '';

  test('navigate to Notes via sidebar; notes-page visible', async ({ page }) => {
    await page.goto(LEARNER_URL);

    await expect(page.locator('[data-testid="home-page"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="appsidebar-nav-notes"]').click();

    await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });
  });

  test('click "New note"; URL contains /notes/<id>', async ({ page }) => {
    await page.goto(LEARNER_URL);
    await page.locator('[data-testid="appsidebar-nav-notes"]').click();
    await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'New note' }).click();

    await expect(page).toHaveURL(/\/notes\/(.+)$/);
    const match = page.url().match(/\/notes\/(.+)$/);
    if (match) noteId = match[1]!;
    expect(noteId).toBeTruthy();
  });

  test('type content; reload; content persisted', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/notes/${noteId}`);

    const textarea = page.getByLabel('Note body');
    await expect(textarea).toBeVisible({ timeout: 10000 });

    await textarea.fill('Photosynthesis is amazing');

    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    await page.reload();

    await expect(page.getByLabel('Note body')).toHaveValue('Photosynthesis is amazing');
  });

  test('open dashboard; note appears in Recent', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/notes`);

    await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="notes-recent-list"]')).toBeVisible({ timeout: 10000 });

    const recentRow = page.locator('[data-testid="notes-recent-list"] [data-testid="note-row"]');
    await expect(recentRow).toBeVisible({ timeout: 5000 });

    await expect(recentRow).toContainText('Photosynthesis');
  });

  test('type in search; result appears; click; editor opens', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/notes`);

    const searchInput = page.getByPlaceholder('Search notes');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('Photosynthesis');

    const searchResult = page.locator('#notes-search-results button');
    await expect(searchResult.first()).toBeVisible({ timeout: 5000 });

    await searchResult.first().click();

    await expect(page).toHaveURL(/\/notes\/(.+)$/);
  });

  test('toggle favorite; reload; appears in Favorites', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/notes`);

    await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

    const starButton = page.getByLabel('Mark as favorite');
    await expect(starButton).toBeVisible({ timeout: 5000 });
    await starButton.click();

    await page.reload();
    await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="notes-favorites-list"]')).toBeVisible({
      timeout: 5000,
    });

    const favRow = page.locator('[data-testid="notes-favorites-list"] [data-testid="note-row"]');
    await expect(favRow).toBeVisible({ timeout: 5000 });
  });

  test('add tag "revision"; reload; Tags section shows it', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/notes/${noteId}`);

    const tagInput = page.getByLabel('Add tag');
    await expect(tagInput).toBeVisible({ timeout: 10000 });

    await tagInput.fill('revision');
    await tagInput.press('Enter');

    await page.goto(`${LEARNER_URL}/notes`);
    await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

    const tagButton = page.locator('[data-testid="notes-page"] button', { hasText: 'revision' });
    await expect(tagButton).toBeVisible({ timeout: 5000 });

    await tagButton.click();

    await expect(page.locator('[data-testid="notes-tags-list"]')).toBeVisible({ timeout: 5000 });
    const taggedRow = page.locator('[data-testid="notes-tags-list"] [data-testid="note-row"]');
    await expect(taggedRow).toBeVisible({ timeout: 5000 });
  });

  test('export single note as Markdown; download triggered', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/notes/${noteId}`);

    let downloadPromise = page.waitForEvent('download');

    await page.getByLabel('Export').click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Export' }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });

  test('delete note; confirm dialog; removed from list', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/notes/${noteId}`);

    await page.getByLabel('Delete').click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const deleteButton = page.getByRole('dialog').getByRole('button', { name: 'Delete' });
    await deleteButton.click();

    await expect(page).toHaveURL(/\/notes$/);

    await expect(page.getByText('No notes yet')).toBeVisible({ timeout: 5000 });
  });
});
