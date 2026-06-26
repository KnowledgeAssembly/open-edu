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

const emptyPackages: PackageSummary[] = [];
const emptyEntries: Record<string, LoadedPackage> = {};

describe('AppShell', () => {
  it('renders without crashing', () => {
    render(<AppShell catalogPackages={emptyPackages} packageEntries={emptyEntries} />);
    expect(screen.getByTestId('left-nav')).toBeInTheDocument();
  });

  it('renders LeftNav Section 1 items', () => {
    render(<AppShell catalogPackages={emptyPackages} packageEntries={emptyEntries} />);
    expect(screen.getByTestId('leftnav-progress')).toBeInTheDocument();
    expect(screen.getByTestId('leftnav-catalog')).toBeInTheDocument();
    expect(screen.getByTestId('leftnav-settings')).toBeInTheDocument();
  });

  it('renders the TopAppBar', () => {
    render(<AppShell catalogPackages={emptyPackages} packageEntries={emptyEntries} />);
    expect(screen.getByTestId('top-app-bar')).toBeInTheDocument();
  });

  it('defaults to home view', () => {
    render(<AppShell catalogPackages={emptyPackages} packageEntries={emptyEntries} />);
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });
});
