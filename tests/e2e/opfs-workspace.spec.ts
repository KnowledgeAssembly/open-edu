import { test, expect, type Page } from '@playwright/test';

const STUDIO_URL = 'http://localhost:4002';

async function openStudio(page: Page): Promise<void> {
  await page.goto(STUDIO_URL);
  await expect(page.getByRole('heading', { name: 'Create a course' })).toBeVisible({
    timeout: 30000,
  });
}

type OpfsWorkspaceApi = {
  writeText(p: string, c: string): Promise<void>;
  write(p: string, d: Uint8Array): Promise<void>;
  readText(p: string): Promise<string>;
  read(p: string): Promise<Uint8Array>;
  list(p: string): Promise<Array<{ path: string }>>;
};

test.describe('OPFSWorkspace (browser smoke)', () => {
  test('create → write → read → reload → read round-trips canonical content', async ({ page }) => {
    await openStudio(page);

    // Ensure the workspace adapter is exposed on the browser build.
    const hasHook = await page.evaluate(() =>
      Boolean((window as unknown as { __openeduWorkspace?: unknown }).__openeduWorkspace),
    );
    expect(hasHook).toBe(true);

    // Clean any prior smoke course.
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const openedu = await root.getDirectoryHandle('openedu', { create: true });
      try {
        await openedu.removeEntry('courses', { recursive: true });
      } catch {
        // absent
      }
    });

    // Write canonical files through the real adapter inside the page context.
    await page.evaluate(async () => {
      const hook = (
        window as unknown as {
          __openeduWorkspace: {
            OPFSWorkspace: new (r: FileSystemDirectoryHandle) => OpfsWorkspaceApi;
          };
        }
      ).__openeduWorkspace;
      const root = await navigator.storage.getDirectory();
      const openedu = await root.getDirectoryHandle('openedu', { create: true });
      const courses = await openedu.getDirectoryHandle('courses', { create: true });
      const courseDir = await courses.getDirectoryHandle('opfs-smoke', { create: true });
      const ws = new hook.OPFSWorkspace(courseDir as FileSystemDirectoryHandle);
      await ws.writeText('package.json', '{"id":"opfs-smoke"}');
      await ws.writeText('nodes/lesson.md', '# Persisted from OPFS');
      await ws.write('assets/pic.png', new Uint8Array([137, 80, 78, 71, 9, 9]));
    });

    const written = await page.evaluate(async () => {
      const hook = (
        window as unknown as {
          __openeduWorkspace: {
            OPFSWorkspace: new (r: FileSystemDirectoryHandle) => OpfsWorkspaceApi;
          };
        }
      ).__openeduWorkspace;
      const root = await navigator.storage.getDirectory();
      const openedu = await root.getDirectoryHandle('openedu', { create: true });
      const courses = await openedu.getDirectoryHandle('courses', { create: true });
      const courseDir = await courses.getDirectoryHandle('opfs-smoke', { create: true });
      const ws = new hook.OPFSWorkspace(courseDir as FileSystemDirectoryHandle);
      return {
        lesson: await ws.readText('nodes/lesson.md'),
        png: Array.from(await ws.read('assets/pic.png')),
        entries: (await ws.list('')).map((e) => e.path),
      };
    });
    expect(written.lesson).toBe('# Persisted from OPFS');
    expect(written.png).toEqual([137, 80, 78, 71, 9, 9]);
    expect(written.entries).toContain('assets');
    expect(written.entries).toContain('nodes');
    expect(written.entries).toContain('package.json');

    // Reload and confirm the workspace is recovered from OPFS.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Create a course' })).toBeVisible({
      timeout: 30000,
    });

    const afterReload = await page.evaluate(async () => {
      const hook = (
        window as unknown as {
          __openeduWorkspace: {
            OPFSWorkspace: new (r: FileSystemDirectoryHandle) => OpfsWorkspaceApi;
          };
        }
      ).__openeduWorkspace;
      const root = await navigator.storage.getDirectory();
      const openedu = await root.getDirectoryHandle('openedu');
      const courses = await openedu.getDirectoryHandle('courses');
      const courseDir = await courses.getDirectoryHandle('opfs-smoke');
      const ws = new hook.OPFSWorkspace(courseDir as FileSystemDirectoryHandle);
      return {
        lesson: await ws.readText('nodes/lesson.md'),
        png: Array.from(await ws.read('assets/pic.png')),
      };
    });
    expect(afterReload.lesson).toBe('# Persisted from OPFS');
    expect(afterReload.png).toEqual([137, 80, 78, 71, 9, 9]);
  });
});
