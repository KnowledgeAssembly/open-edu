import { useState } from 'react';
import { RuntimeThemeProvider } from '@open-edu/runtime';

type Screen =
  | { type: 'catalog' }
  | { type: 'course'; packageDir: string }
  | { type: 'complete'; packageDir: string; badges: string[] };

export function App(): JSX.Element {
  const [screen] = useState<Screen>({ type: 'catalog' });

  return (
    <RuntimeThemeProvider>
      {screen.type === 'catalog' && (
        <div data-testid="catalog-page">Catalog (placeholder)</div>
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
