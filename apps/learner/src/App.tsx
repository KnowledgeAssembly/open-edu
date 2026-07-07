import { useMemo } from 'react';
import type { LoadedBundle } from '@open-edu/core';
import { AppShell } from './AppShell';
import { catalogPackages, packageEntries, catalogBundles, bundleEntries } from 'virtual:edu-data';

export function App(): JSX.Element {
  const reconstructedBundleEntries = useMemo<Record<string, LoadedBundle>>(() => {
    const result: Record<string, LoadedBundle> = {};
    for (const [id, data] of Object.entries(bundleEntries)) {
      const raw = data as unknown as Omit<LoadedBundle, 'moduleMap'> & {
        moduleMap: [string, unknown][];
      };
      result[id] = {
        ...raw,
        moduleMap: new Map(raw.moduleMap),
      } as LoadedBundle;
    }
    return result;
  }, []);

  return (
    <AppShell
      catalogPackages={catalogPackages}
      packageEntries={packageEntries}
      catalogBundles={catalogBundles}
      bundleEntries={reconstructedBundleEntries}
    />
  );
}
