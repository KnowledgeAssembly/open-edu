import { useState } from 'react';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import type { LoadedPackage } from '@open-edu/core';
import { CatalogPage } from './CatalogPage';
import { CoursePage } from './CoursePage';

import { catalogPackages, packageEntries } from 'virtual:edu-data';

type Screen = { type: 'catalog' } | { type: 'course'; pkg: LoadedPackage; packageDir: string };

export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ type: 'catalog' });

  const handleStartCourse = (packageDir: string) => {
    const pkg = Object.values(packageEntries).find((p) => p.rootDir === packageDir);
    if (pkg) {
      setScreen({ type: 'course', pkg, packageDir });
    }
  };

  const handleBackToCatalog = () => {
    setScreen({ type: 'catalog' });
  };

  return (
    <RuntimeThemeProvider>
      {screen.type === 'catalog' && (
        <CatalogPage packages={catalogPackages} onStartCourse={handleStartCourse} />
      )}
      {screen.type === 'course' && (
        <CoursePage pkg={screen.pkg} onBackToCatalog={handleBackToCatalog} />
      )}
    </RuntimeThemeProvider>
  );
}
