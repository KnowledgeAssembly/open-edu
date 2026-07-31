import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './AppShell';
import type { LoadedPackage, PackageSummary } from '@open-edu/core';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => Promise.resolve({})),
  getProgress: vi.fn(() => Promise.resolve(null)),
  saveProgress: vi.fn(() => Promise.resolve()),
}));

vi.mock('@open-edu/llm-config', () => ({
  createLlmProvider: vi.fn(() => ({
    generateStructured: vi.fn().mockResolvedValue({ text: 'test response' }),
  })),
}));

vi.mock('@open-edu/runtime', async () => {
  const actual = await vi.importActual('@open-edu/runtime');
  return {
    ...actual,
    useThemePreference: vi.fn(() => ['lumina-scholastica' as const, vi.fn()]),
  };
});

vi.mock('@open-edu/pwa-core', () => ({
  getInstallState: vi.fn().mockReturnValue({
    isInstallable: false,
    isInstalled: false,
    platform: 'desktop',
  }),
  promptInstall: vi.fn().mockResolvedValue({ outcome: 'dismissed' }),
  registerUpdateListener: vi.fn().mockResolvedValue(vi.fn()),
  skipWaiting: vi.fn().mockResolvedValue(undefined),
  getUpdateState: vi.fn().mockReturnValue({ updateAvailable: false, registration: null }),
  getOnlineStatus: vi.fn().mockReturnValue(true),
  onOnlineStatusChange: vi.fn().mockReturnValue(vi.fn()),
  getStorageUsage: vi.fn().mockReturnValue({ usage: 0, quota: 0 }),
}));

import type { BundleSummary, LoadedBundle } from '@open-edu/core';

const emptyPackages: PackageSummary[] = [];
const emptyEntries: Record<string, LoadedPackage> = {};
const emptyBundles: BundleSummary[] = [];
const emptyBundleEntries: Record<string, LoadedBundle> = {};

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/']) {
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries });
  return render(<RouterProvider router={router} />);
}

describe('AppShell', () => {
  it('renders without crashing', () => {
    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
    );
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
  });

  it('renders AppSidebar nav items', () => {
    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
    );
    expect(screen.getByTestId('appsidebar-nav-progress')).toBeInTheDocument();
    expect(screen.getByTestId('appsidebar-nav-catalog')).toBeInTheDocument();
    expect(screen.getByTestId('appsidebar-nav-settings')).toBeInTheDocument();
  });

  it('renders the app shell', () => {
    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
    );
    expect(screen.getByTestId('app-main')).toBeInTheDocument();
  });

  it('defaults to home view', () => {
    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
    );
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('renders Pipili button in the course header', async () => {
    const bundleModule: LoadedPackage = {
      rootDir: 'oep://bundle-1/module-a',
      manifest: {
        id: 'module-a',
        title: 'Module A',
        version: '1.0.0',
        author: 'Author',
        entry: 'nodes/a.md',
      },
      workflow: {
        routing: { 'nodes/a.md': { onComplete: 'nodes/a.md' } },
      },
      rewards: null,
      cards: null,
      nodes: [
        {
          path: 'oep://bundle-1/module-a/nodes/a.md',
          relativePath: 'nodes/a.md',
          content: '# M',
          node: { type: 'lesson', title: 'M' },
        },
      ],
      assetPaths: [],
      assetMap: new Map(),
    };

    const loadedBundle: LoadedBundle = {
      rootDir: 'oep://bundle-1',
      manifest: {
        id: 'bundle-1',
        type: 'bundle',
        title: 'Bundle One',
        version: '1.0.0',
        author: 'Author',
        modules: [{ id: 'module-a', title: 'Module A', path: './modules/module-a', dependsOn: [] }],
      },
      modules: [bundleModule],
      moduleMap: new Map([['module-a', bundleModule]]),
      rewards: null,
      cards: null,
    };

    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={{ 'bundle-1': loadedBundle }}
      />,
      ['/course/bundle-1/module-a'],
    );

    expect(await screen.findByRole('button', { name: 'Ask Pipili' })).toBeInTheDocument();
  });

  it('renders Pipili button in the header on non-course pages too', () => {
    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
      ['/'],
    );
    expect(screen.getByRole('button', { name: 'Ask Pipili' })).toBeInTheDocument();
  });

  it('renders catalog heading at /catalog route', () => {
    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
      ['/catalog'],
    );
    // With no packages, the empty state shows
    expect(screen.getByText('No courses yet')).toBeInTheDocument();
  });

  it('renders settings at /settings route', () => {
    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
      ['/settings'],
    );
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
  });

  it('back to catalog from a bundle course navigates to the bundle overview', async () => {
    const bundleModule: LoadedPackage = {
      rootDir: 'oep://bundle-1/module-a',
      manifest: {
        id: 'module-a',
        title: 'Module A',
        version: '1.0.0',
        author: 'Author',
        entry: 'nodes/a.md',
      },
      workflow: null,
      rewards: null,
      cards: null,
      nodes: [],
      assetPaths: [],
      assetMap: new Map(),
    };

    const loadedBundle: LoadedBundle = {
      rootDir: 'oep://bundle-1',
      manifest: {
        id: 'bundle-1',
        type: 'bundle',
        title: 'Bundle One',
        version: '1.0.0',
        author: 'Author',
        modules: [{ id: 'module-a', title: 'Module A', path: './modules/module-a', dependsOn: [] }],
      },
      modules: [bundleModule],
      moduleMap: new Map([['module-a', bundleModule]]),
      rewards: null,
      cards: null,
    };

    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={{ 'bundle-1': loadedBundle }}
      />,
      ['/course/bundle-1/module-a'],
    );

    const backButton = await screen.findByRole('button', { name: /back to catalog/i });
    expect(backButton).toBeInTheDocument();

    backButton.click();

    // Leaving a course mid-progress shows the exit warning; confirm "Leave"
    // to reach the bundle overview.
    const leaveButton = await screen.findByTestId('exit-warning-leave');
    leaveButton.click();

    await screen.findByTestId('bundle-overview');
  });

  it('shows exit warning when navigating away from a bundle course mid-course', async () => {
    const bundleModule: LoadedPackage = {
      rootDir: 'oep://bundle-1/module-a',
      manifest: {
        id: 'module-a',
        title: 'Module A',
        version: '1.0.0',
        author: 'Author',
        entry: 'nodes/a.md',
      },
      workflow: {
        routing: { 'nodes/a.md': { onComplete: 'nodes/a.md' } },
      },
      rewards: null,
      cards: null,
      nodes: [
        {
          path: 'oep://bundle-1/module-a/nodes/a.md',
          relativePath: 'nodes/a.md',
          content: '# M',
          node: { type: 'lesson', title: 'M' },
        },
      ],
      assetPaths: [],
      assetMap: new Map(),
    };

    const loadedBundle: LoadedBundle = {
      rootDir: 'oep://bundle-1',
      manifest: {
        id: 'bundle-1',
        type: 'bundle',
        title: 'Bundle One',
        version: '1.0.0',
        author: 'Author',
        modules: [{ id: 'module-a', title: 'Module A', path: './modules/module-a', dependsOn: [] }],
      },
      modules: [bundleModule],
      moduleMap: new Map([['module-a', bundleModule]]),
      rewards: null,
      cards: null,
    };

    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <AppShell
              catalogPackages={emptyPackages}
              packageEntries={emptyEntries}
              catalogBundles={emptyBundles}
              bundleEntries={{ 'bundle-1': loadedBundle }}
            />
          ),
        },
      ],
      { initialEntries: ['/course/bundle-1/module-a'] },
    );
    render(<RouterProvider router={router} />);

    await screen.findByTestId('appsidebar-nav-settings');
    fireEvent.click(screen.getByTestId('appsidebar-nav-settings'));

    expect(
      await screen.findByTestId('exit-warning-dialog', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
