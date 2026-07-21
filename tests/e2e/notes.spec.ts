/*
 * Prerequisites:
 * 1. Start learner dev server: pnpm --filter @open-edu/learner dev
 * 2. Run: pnpm test:e2e
 *
 * Each test creates its own note data via the UI because every
 * Playwright test gets a fresh browser context (empty IndexedDB).
 */

import { test, expect } from '@playwright/test';

const LEARNER_URL = 'http://localhost:4001';

async function createNoteAndGetId(page: import('@playwright/test').Page): Promise<string> {
  await page.goto(LEARNER_URL);
  await page.locator('[data-testid="appsidebar-nav-notes"]').click();
  await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'New note' }).first().click();
  await expect(page).toHaveURL(/\/notes\/(.+)$/);
  const match = page.url().match(/\/notes\/(.+)$/);
  expect(match).toBeTruthy();
  return match![1]!;
}

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

  await page.getByRole('button', { name: 'New note' }).first().click();
  await expect(page).toHaveURL(/\/notes\/(.+)$/);

  const body = page.locator('[data-testid="note-body"]');
  await expect(body).toBeVisible({ timeout: 10000 });
});

test('type content; reload; content persisted', async ({ page }) => {
  const noteId = await createNoteAndGetId(page);

  const body = page.locator('[data-testid="note-body"]');
  await expect(body).toBeVisible({ timeout: 10000 });

  await body.fill('Photosynthesis is amazing');

  await expect(page.locator('span[aria-live="polite"]')).toContainText('Saved', { timeout: 5000 });

  await page.reload();

  await expect(page.locator('[data-testid="note-body"]')).toHaveValue('Photosynthesis is amazing');
});

test('open dashboard; note appears in Recent', async ({ page }) => {
  const noteId = await createNoteAndGetId(page);
  await page.locator('[data-testid="note-body"]').fill('Test note for recent list');
  await expect(page.locator('span[aria-live="polite"]')).toContainText('Saved', { timeout: 5000 });

  await page.goto(`${LEARNER_URL}/notes`);
  await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

  await expect(page.locator('[data-testid="notes-recent-list"]')).toBeVisible({ timeout: 10000 });

  const recentRow = page.locator('[data-testid="notes-recent-list"] [data-testid="note-row"]');
  await expect(recentRow).toBeVisible({ timeout: 5000 });
  await expect(recentRow).toContainText('Test note for recent');
});

test('type in search; result appears; click; editor opens', async ({ page }) => {
  const noteId = await createNoteAndGetId(page);
  await page.locator('[data-testid="note-body"]').fill('Unique search term');
  await expect(page.locator('span[aria-live="polite"]')).toContainText('Saved', { timeout: 5000 });

  await page.goto(`${LEARNER_URL}/notes`);
  await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

  const searchInput = page.getByPlaceholder('Search notes');
  await expect(searchInput).toBeVisible({ timeout: 10000 });
  await searchInput.fill('Unique search term');

  const searchResult = page.locator('#notes-search-results button');
  await expect(searchResult.first()).toBeVisible({ timeout: 5000 });
  await searchResult.first().click();

  await expect(page).toHaveURL(/\/notes\/(.+)$/);
  await expect(page.locator('[data-testid="note-body"]')).toBeVisible({ timeout: 10000 });
});

test('toggle favorite; reload; appears in Favorites', async ({ page }) => {
  const noteId = await createNoteAndGetId(page);
  await page.locator('[data-testid="note-body"]').fill('Fav note');
  await expect(page.locator('span[aria-live="polite"]')).toContainText('Saved', { timeout: 5000 });

  await page.goto(`${LEARNER_URL}/notes`);
  await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

  const starButton = page.getByLabel('Mark as favorite');
  await expect(starButton).toBeVisible({ timeout: 5000 });
  await starButton.click();

  await page.reload();
  await expect(page.locator('[data-testid="notes-page"]')).toBeVisible({ timeout: 10000 });

  await expect(page.locator('[data-testid="notes-favorites-list"]')).toBeVisible({ timeout: 5000 });

  const favRow = page.locator('[data-testid="notes-favorites-list"] [data-testid="note-row"]');
  await expect(favRow).toBeVisible({ timeout: 5000 });
});

test('add tag; reload; Tags section shows it', async ({ page }) => {
  const noteId = await createNoteAndGetId(page);
  await page.locator('[data-testid="note-body"]').fill('Tagged note');
  await expect(page.locator('span[aria-live="polite"]')).toContainText('Saved', { timeout: 5000 });

  const tagInput = page.getByRole('textbox', { name: 'Add tag' });
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
  const noteId = await createNoteAndGetId(page);
  await page.locator('[data-testid="note-body"]').fill('Export me');
  await expect(page.locator('span[aria-live="polite"]')).toContainText('Saved', { timeout: 5000 });

  let downloadPromise = page.waitForEvent('download');

  await page.getByLabel('Export').click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

  await page.getByRole('dialog').getByRole('button', { name: 'Export' }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/);
});

test('delete note; confirm dialog; removed from list', async ({ page }) => {
  const noteId = await createNoteAndGetId(page);
  await page.locator('[data-testid="note-body"]').fill('Delete me');
  await expect(page.locator('span[aria-live="polite"]')).toContainText('Saved', { timeout: 5000 });

  await page.getByLabel('Delete').click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

  const deleteButton = page.getByRole('dialog').getByRole('button', { name: 'Delete' });
  await deleteButton.click();

  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByText('No notes yet')).toBeVisible({ timeout: 5000 });
});
