import { useState } from 'react';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { CatalogPage } from './CatalogPage';
import { CoursePage } from './CoursePage';

type Screen =
  | { type: 'catalog' }
  | { type: 'course'; packageDir: string }
  | { type: 'complete'; packageDir: string; badges: string[] };

export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ type: 'catalog' });

  const handleStartCourse = (packageDir: string) => {
    setScreen({ type: 'course', packageDir });
  };

  const handleComplete = (packageDir: string, badges: string[]) => {
    setScreen({ type: 'complete', packageDir, badges });
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
        <CoursePage packageDir={screen.packageDir} onComplete={handleComplete} onBackToCatalog={handleBackToCatalog} />
      )}
      {screen.type === 'complete' && (
        <div data-testid="complete-page" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Course Completed!</h1>
          <p>Badges earned: {screen.badges.length > 0 ? screen.badges.join(', ') : 'None'}</p>
          <button onClick={handleBackToCatalog}>Back to catalog</button>
        </div>
      )}
    </RuntimeThemeProvider>
  );
}
