declare module 'virtual:open-edu-package' {
  import type { LoadedPackage, LoadedBundle } from '@open-edu/core';
  export const packageData: LoadedPackage | null;
  export const bundleData: LoadedBundle | null;
}
