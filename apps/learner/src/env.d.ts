declare module 'virtual:edu-data' {
  import type { PackageSummary, LoadedPackage } from '@open-edu/core';
  export const catalogPackages: PackageSummary[];
  export const packageEntries: Record<string, LoadedPackage>;
}
