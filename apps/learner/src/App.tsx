import { useState } from 'react';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { CatalogPage } from './CatalogPage';

type Screen =
  | { type: 'catalog' }
  | { type: 'course'; packageDir: string }
  | { type: 'complete'; packageDir: string; badges: string[] };

export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ type: 'catalog' });

  const handleStartCourse = (packageDir: string) => {
    setScreen({ type: 'course', packageDir });
  };

  return (
    <RuntimeThemeProvider>
      {screen.type === 'catalog' && (
        <CatalogPage packageDir="../../examples" onStartCourse={handleStartCourse} />
      )}
      {screen.type === 'course' && (
        <div data-testid="course-page">Course: {screen.packageDir} (placeholder)</div>
      )}
      {screen.type === 'complete' && (
        <div data-testid="complete-page">
          Complete: {screen.packageDir} | Badges: {screen.badges.join(', ')}
        </div>
      )}
    </RuntimeThemeProvider>
  );
}
