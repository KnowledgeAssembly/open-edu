import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { startServer, type TestServer } from './helpers';

const HELLO_WORLD = resolve('examples/hello-world');
const INTRO_JS = resolve('examples/intro-javascript');

test.describe('hello-world (single lesson node)', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(HELLO_WORLD);
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('loads and displays the package title', async ({ page }) => {
    await page.goto(server.url);
    const title = page.getByRole('heading', { level: 1 }).first();
    await expect(title).toHaveText('Hello World');
  });

  test('renders markdown content from the lesson node', async ({ page }) => {
    await page.goto(server.url);
    await expect(page.getByText('Welcome to your first Open-Edu learning package!')).toBeVisible();
    await expect(
      page.getByText('Educational Packages are portable learning experiences'),
    ).toBeVisible();
  });

  test('shows progress bar on initial load', async ({ page }) => {
    await page.goto(server.url);
    const progressbar = page.getByRole('progressbar').first();
    await expect(progressbar).toBeVisible();
  });

  test('clicks Next to complete the learning experience', async ({ page }) => {
    await page.goto(server.url);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });

  test('completion hides the Next button', async ({ page }) => {
    await page.goto(server.url);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('button', { name: 'Next' })).toBeHidden();
  });
});

test.describe('intro-javascript (multi-node linear)', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(INTRO_JS);
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('renders the first lesson node on load', async ({ page }) => {
    await page.goto(server.url);
    const title = page.getByRole('heading', { level: 1 }).first();
    await expect(title).toHaveText('Introduction to JavaScript');
    await expect(page.getByText('JavaScript is a programming language')).toBeVisible();
  });

  test('navigates through all 4 nodes to completion', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Variables store data in JavaScript')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText('Which of these correctly declares a JavaScript variable?'),
    ).toBeVisible();
    await page.getByLabel('let score = 0;').click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Congratulations!')).toBeVisible();
    await expect(
      page.getByText("You've completed the Introduction to JavaScript lesson"),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });

  test('progress bar shows correct total', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(1000);
    const footer = page.locator('footer');
    await expect(footer.getByText('/ 4')).toBeVisible();
  });
});

test.describe('fractions (conditional branching)', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(resolve('examples/fractions'));
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('passes quiz with correct answer and reaches advanced node', async ({ page }) => {
    await page.goto(server.url);
    const title = page.getByRole('heading', { level: 1 }).first();
    await expect(title).toHaveText('Understanding Fractions');
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Which statements about fractions are correct?')).toBeVisible();
    await page.getByLabel('1/2 is equivalent to 0.5').click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Great work! You have a solid understanding')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });

  test('fails quiz with wrong answer and reaches remediation node', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);

    await page.getByLabel('The denominator can be zero').click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Let's review the basics again")).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });
});

test.describe('widget-practice (widget exercise)', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(resolve('examples/widget-practice'));
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('renders intro and navigates to widget', async ({ page }) => {
    await page.goto(server.url);
    await expect(page.getByText('Widget Practice')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('What is the capital of France?')).toBeVisible();
  });

  test('selects correct answer and completes', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);
    await page.getByLabel('Paris').click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Paris is the capital')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/completed/)).toBeVisible();
  });

  test('selects wrong answer and completes', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);
    await page.getByLabel('London').click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Incorrect')).toBeVisible();
  });
});

test.describe('autism-reading (lesson → quiz → reflection)', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startServer(resolve('examples/autism-reading'));
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('loads with correct title and lesson content', async ({ page }) => {
    await page.goto(server.url);
    const title = page.getByRole('heading', { level: 1 }).first();
    await expect(title).toHaveText('A Day at the Park');
    await expect(page.getByText('Sam and Max went to the park')).toBeVisible();
  });

  test('navigates full journey: lesson → quiz → reflection → completion', async ({ page }) => {
    await page.goto(server.url);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('What did Sam and Max do at the park?')).toBeVisible();
    await page.getByLabel('They fed the ducks').click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('How did Sam and Max feel at the end of the day?')).toBeVisible();
    await page.getByRole('textbox').fill('They felt happy after playing outside.');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('You have completed this learning experience.')).toBeVisible();
  });
});
