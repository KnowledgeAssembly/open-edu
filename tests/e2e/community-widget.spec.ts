import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { seedRegistry, WIDGET_REGISTRY_DIR, WIDGET_DOCUMENT_FILE } from './registry-store.mjs';

const LEARNER_URL = 'http://localhost:4001';
const REGISTRY_URL = 'http://localhost:4002';
const WIDGET_ID = 'community.example.counter';
const WIDGET_PUBLISHER = 'localpub';
const WIDGET_VERSION = '1.0.0';
const COURSE_TITLE = 'Community Widget Counter Course';
const CATALOG_URL = `${REGISTRY_URL}/widget-registry/catalog.json`;

test.beforeEach(async () => {
  await seedRegistry();
});

test.afterAll(async () => {
  const { rm } = await import('node:fs/promises');
  await rm(WIDGET_REGISTRY_DIR, { recursive: true, force: true });
});

async function seedGlobals(
  page: Page,
  opts: { offline?: boolean; now?: number } = {},
): Promise<void> {
  await page.addInitScript(
    (args: { origins: string; catalogUrl: string; offline?: boolean; now?: number }) => {
      const w = window as unknown as Record<string, unknown>;
      w.__OPEN_EDU_WIDGET_ORIGINS__ = args.origins;
      w.__OPEN_EDU_WIDGET_CATALOG_URL__ = args.catalogUrl;
      w.__OPEN_EDU_ALLOW_EXPERIMENTAL_WIDGETS__ = true;
      if (args.offline !== undefined && args.offline !== null) {
        w.__OPEN_EDU_ONLINE__ = args.offline ? 'false' : 'true';
      }
      if (args.now !== undefined && args.now !== null) {
        w.__OPEN_EDU_NOW__ = args.now;
      }
    },
    { origins: REGISTRY_URL, catalogUrl: CATALOG_URL, offline: opts.offline, now: opts.now },
  );
}

async function registerRegistryRoute(page: Page, offline: () => boolean): Promise<void> {
  await page.route('**/widget-registry/**', async (route) => {
    if (offline()) {
      await route.abort();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'cache-control': 'no-store' },
    });
  });
  await page.route('**/cdn.example.com/**', async (route) => {
    const documentBytes = await readFile(WIDGET_DOCUMENT_FILE);
    await route.fulfill({ body: documentBytes, contentType: 'text/html' });
  });
}

async function navigateToCatalog(page: Page): Promise<void> {
  await page.goto(LEARNER_URL);
  await page
    .locator('[data-testid="home-page"]')
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  const browseBtn = page.getByText('Browse Courses');
  if (await browseBtn.isVisible().catch(() => false)) {
    await browseBtn.click();
  } else {
    const catalogNav = page.locator('[data-testid="appsidebar-nav-catalog"]');
    if (await catalogNav.isVisible().catch(() => false)) {
      await catalogNav.click();
    }
  }
  await page.locator('[data-testid="catalog-page"]').waitFor({ timeout: 20000 });
}

async function openCounterCourse(page: Page): Promise<void> {
  await navigateToCatalog(page);
  const card = page.locator('[data-testid="course-card"]', { hasText: COURSE_TITLE }).first();
  await expect(card).toBeVisible({ timeout: 20000 });
  await card.click();
  await page.locator('[data-testid="course-runtime"]').waitFor({ timeout: 20000 });
}

async function waitForWidgetFrame(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="sandbox-widget-frame"]')).toBeVisible({
    timeout: 20000,
  });
}

async function revokeWidget(page: Page): Promise<void> {
  const response = await page.request.post(
    `${REGISTRY_URL}/widget-registry/${WIDGET_PUBLISHER}/${WIDGET_ID}/${WIDGET_VERSION}/revoke`,
  );
  expect(response.status()).toBe(200);
}

test('catalog.json lists the community widget under the local registry', async ({ page }) => {
  const response = await page.request.get(CATALOG_URL);
  expect(response.status()).toBe(200);
  const catalog = (await response.json()) as {
    registryId: string;
    origin: string;
    widgets: { id: string; status: string; manifestUrl: string }[];
  };
  expect(catalog.registryId).toBe('localdev');
  expect(catalog.origin).toBe(REGISTRY_URL);
  const widget = catalog.widgets.find((w) => w.id === WIDGET_ID);
  expect(widget).toBeDefined();
  expect(widget!.status).toBe('experimental');
  expect(widget!.manifestUrl).toContain('/widget-registry/');
});

test('course loads a sandboxed widget iframe with readable controls', async ({ page }) => {
  let offline = false;
  await registerRegistryRoute(page, () => offline);
  await seedGlobals(page);
  await openCounterCourse(page);

  await waitForWidgetFrame(page);
  const frameLocator = page.frameLocator('[data-testid="sandbox-widget-frame"]');
  await expect(frameLocator.getByTestId('counter-increment')).toBeVisible({ timeout: 15000 });

  const sandboxAttr = await page
    .locator('[data-testid="sandbox-widget-frame"]')
    .getAttribute('sandbox');
  expect(sandboxAttr).toContain('allow-scripts');
  expect(sandboxAttr).not.toContain('allow-same-origin');
});

test('interacting to target completes the course and completion persists across reload', async ({
  page,
}) => {
  let offline = false;
  await registerRegistryRoute(page, () => offline);
  await seedGlobals(page);
  await openCounterCourse(page);

  await waitForWidgetFrame(page);
  const frameLocator = page.frameLocator('[data-testid="sandbox-widget-frame"]');
  await expect(frameLocator.getByTestId('counter-increment')).toBeVisible({ timeout: 15000 });

  for (let i = 0; i < 5; i++) {
    await frameLocator.getByTestId('counter-increment').click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator('[data-testid="completion-screen"]')).toBeVisible({
    timeout: 15000,
  });

  await page.reload();
  const completedState = page
    .locator('[data-testid="completion-screen"]')
    .or(page.getByText('You have completed this learning experience.').first());
  await expect(completedState).toBeVisible({ timeout: 20000 });
  const restoredFrame = page.frameLocator('[data-testid="sandbox-widget-frame"]');
  if ((await restoredFrame.getByTestId('counter-count').count()) > 0) {
    await expect(restoredFrame.getByTestId('counter-count')).toHaveText('5', {
      timeout: 10000,
    });
  }
});

test('the sandboxed widget iframe cannot access learner storage or the parent window', async ({
  page,
}) => {
  let offline = false;
  await registerRegistryRoute(page, () => offline);
  await seedGlobals(page);
  await openCounterCourse(page);

  await waitForWidgetFrame(page);
  const handle = await page.locator('[data-testid="sandbox-widget-frame"]').elementHandle();
  const frame = await handle!.contentFrame();

  const storageResult = await frame!.evaluate(() => {
    try {
      localStorage.setItem('x', 'y');
      return localStorage.getItem('x') ?? 'unset';
    } catch (e) {
      return `blocked:${e instanceof Error ? e.name : String(e)}`;
    }
  });
  expect(storageResult).not.toBe('y');

  const parentUrl = await frame!.evaluate(() => {
    try {
      return window.top.location.href;
    } catch {
      return 'blocked';
    }
  });
  expect(parentUrl).toBe('blocked');
  await expect(page).toHaveURL(/\/course\/community-widget-counter-course/);
});

test('offline course still loads the widget from the artifact cache', async ({ page }) => {
  let offline = false;
  await registerRegistryRoute(page, () => offline);
  await seedGlobals(page);
  await openCounterCourse(page);
  await waitForWidgetFrame(page);

  offline = true;
  await page.reload();
  await waitForWidgetFrame(page);
  const frameLocator = page.frameLocator('[data-testid="sandbox-widget-frame"]');
  await expect(frameLocator.getByTestId('counter-increment')).toBeVisible({ timeout: 15000 });
});

test('online revoke makes the widget unavailable immediately', async ({ page }) => {
  let offline = false;
  await registerRegistryRoute(page, () => offline);
  await seedGlobals(page);

  await revokeWidget(page);

  await openCounterCourse(page);
  await expect(page.locator('[data-testid="widget-unavailable"]')).toBeVisible({
    timeout: 20000,
  });
  expect(await page.locator('[data-testid="sandbox-widget-frame"]').count()).toBe(0);
});

test('revoked widget still loads from cache offline within the 7d grace period', async ({
  page,
}) => {
  let offline = false;
  await registerRegistryRoute(page, () => offline);
  await seedGlobals(page);
  await openCounterCourse(page);
  await waitForWidgetFrame(page);

  await revokeWidget(page);

  await page.reload();
  await expect(page.locator('[data-testid="widget-unavailable"]')).toBeVisible({
    timeout: 20000,
  });

  offline = true;
  await seedGlobals(page, {
    offline: true,
    now: Date.now() + 5 * 24 * 60 * 60 * 1000,
  });
  await page.reload();

  await waitForWidgetFrame(page);
  const frameLocator = page.frameLocator('[data-testid="sandbox-widget-frame"]');
  await expect(frameLocator.getByTestId('counter-increment')).toBeVisible({ timeout: 15000 });
});

test('revoked widget is hard-blocked offline after the 7d grace period', async ({ page }) => {
  let offline = false;
  await registerRegistryRoute(page, () => offline);
  await seedGlobals(page);
  await openCounterCourse(page);
  await waitForWidgetFrame(page);

  await revokeWidget(page);

  await page.reload();
  await expect(page.locator('[data-testid="widget-unavailable"]')).toBeVisible({
    timeout: 20000,
  });

  offline = true;
  await seedGlobals(page, {
    offline: true,
    now: Date.now() + 8 * 24 * 60 * 60 * 1000,
  });
  await page.reload();

  await expect(page.locator('[data-testid="widget-unavailable"]')).toBeVisible({
    timeout: 20000,
  });
  expect(await page.locator('[data-testid="sandbox-widget-frame"]').count()).toBe(0);
});
