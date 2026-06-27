/// <reference types="vite/client" />

declare module 'virtual:edu-data' {
  import type { PackageSummary, LoadedPackage, BundleSummary, LoadedBundle } from '@open-edu/core';
  export const catalogPackages: PackageSummary[];
  export const packageEntries: Record<string, LoadedPackage>;
  export const catalogBundles: BundleSummary[];
  export const bundleEntries: Record<string, LoadedBundle>;
}
