import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';
import type { LoadedPackage, PackageSummary } from '@open-edu/core';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => ({})),
  getProgress: vi.fn(() => null),
  saveProgress: vi.fn(),
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

describe('AppShell', () => {
  it('renders without crashing', () => {
    render(
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
    render(
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
    render(
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
    render(
      <AppShell
        catalogPackages={emptyPackages}
        packageEntries={emptyEntries}
        catalogBundles={emptyBundles}
        bundleEntries={emptyBundleEntries}
      />,
    );
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });
});
