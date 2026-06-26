import { useState, useEffect } from 'react';
import { ThemeSelector, type ThemeId } from '@open-edu/runtime';

export interface SettingsPageProps {
  currentThemeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

export function SettingsPage({ currentThemeId, onThemeChange }: SettingsPageProps): JSX.Element {
  const [fontSize, setFontSize] = useState(100);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--oe-font-size-scale', `${fontSize}%`);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--oe-reduced-motion',
      reducedMotion ? 'reduce' : 'no-preference',
    );
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.style.setProperty('--oe-high-contrast', highContrast ? '1' : '0');
  }, [highContrast]);

  return (
    <div className="p-xl max-w-3xl mx-auto" data-testid="settings-page">
      <h1 className="text-h1 font-display text-on-surface font-bold mb-lg">Settings</h1>

      <div className="flex flex-col gap-lg">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <h2 className="text-h2 font-title text-on-surface mb-md">Theme</h2>
          <ThemeSelector currentThemeId={currentThemeId} onThemeChange={onThemeChange} />
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <h2 className="text-h2 font-title text-on-surface mb-md">Accessibility</h2>

          <div className="flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-on-surface text-sm">Font Size</p>
                <p className="text-xs text-on-surface-variant">Adjust text size</p>
              </div>
              <div className="flex items-center gap-sm">
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.max(80, s - 10))}
                  className="px-2 py-1 text-sm border border-outline-variant rounded bg-surface hover:bg-surface-variant"
                  aria-label="Decrease font size"
                >
                  A-
                </button>
                <span className="text-sm min-w-[3em] text-center font-mono">{fontSize}%</span>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(150, s + 10))}
                  className="px-2 py-1 text-sm border border-outline-variant rounded bg-surface hover:bg-surface-variant"
                  aria-label="Increase font size"
                >
                  A+
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-on-surface text-sm">Reduced Motion</p>
                <p className="text-xs text-on-surface-variant">Minimize animations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Reduced Motion"
                />
                <div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-on-surface text-sm">High Contrast</p>
                <p className="text-xs text-on-surface-variant">Increase color contrast</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="sr-only peer"
                  aria-label="High Contrast"
                />
                <div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
