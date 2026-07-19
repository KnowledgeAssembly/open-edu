import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('renders the TopAppBar', () => {
    renderWithRouter(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
    );
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
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
});
