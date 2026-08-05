declare module 'virtual:open-edu-package' {
  import type { LoadedPackage, LoadedBundle } from '@open-edu/core';
  export const packageData: LoadedPackage | null;
  export const bundleData: LoadedBundle | null;
}

declare const OPEN_EDU_STUDIO_MODE: string | undefined;
