import { useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { StudioTopBar } from './components/StudioTopBar.js';
import type { StudioMode, StudioView } from './types.js';

export function StudioApp({
  mode,
  onModeChange,
}: {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<StudioView>('home');

  const handleNavigate = (next: StudioView) => setView(next);

  return (
    <div className="flex h-screen flex-col">
      <StudioTopBar mode={mode} onModeChange={onModeChange} view={view} onNavigate={handleNavigate} />
      <main className="bg-surface min-h-0 flex-1 overflow-auto p-6">
        <p className="text-on-surface-variant">{t('studio.home.emptyRecent')}</p>
      </main>
    </div>
  );
}
