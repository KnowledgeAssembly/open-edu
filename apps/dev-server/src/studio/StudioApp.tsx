import { useState } from 'react';
import { HomeView } from './components/HomeView.js';
import { StudioTopBar } from './components/StudioTopBar.js';
import { createStudioApi } from './studioApi.js';
import type { StudioMode, StudioView } from './types.js';

export function StudioApp({
  mode,
  onModeChange,
}: {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
}) {
  const [view, setView] = useState<StudioView>('home');
  const api = createStudioApi();

  const handleNavigate = (next: StudioView) => setView(next);

  return (
    <div className="flex h-screen flex-col">
      <StudioTopBar mode={mode} onModeChange={onModeChange} view={view} onNavigate={handleNavigate} />
      <main className="bg-surface min-h-0 flex-1 overflow-auto">
        {view === 'home' ? (
          <HomeView api={api} onOpened={() => handleNavigate('outline')} onError={() => {}} />
        ) : null}
      </main>
    </div>
  );
}
