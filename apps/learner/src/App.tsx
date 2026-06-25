import { useState } from 'react';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { CatalogPage } from './CatalogPage';
import { CoursePage } from './CoursePage';

type Screen = { type: 'catalog' } | { type: 'course'; packageDir: string };

export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ type: 'catalog' });

  const handleStartCourse = (packageDir: string) => {
    setScreen({ type: 'course', packageDir });
  };

  const handleBackToCatalog = () => {
    setScreen({ type: 'catalog' });
  };

  return (
    <RuntimeThemeProvider>
      {screen.type === 'catalog' && (
        <CatalogPage packageDir="../../examples" onStartCourse={handleStartCourse} />
      )}
      {screen.type === 'course' && (
        <CoursePage packageDir={screen.packageDir} onBackToCatalog={handleBackToCatalog} />
      )}
    </RuntimeThemeProvider>
  );
}
