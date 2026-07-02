import { useState, useEffect } from 'react';
import { ThemeSelector, type ThemeId } from '@open-edu/runtime';
import { Button, Card, CardContent, CardHeader, Switch, useFontSize } from '@open-edu/design-system';
import { Sun, Eye, Type, Minus, Plus } from 'lucide-react';

export interface SettingsPageProps {
  currentThemeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

export function SettingsPage({ currentThemeId, onThemeChange }: SettingsPageProps): JSX.Element {
  const { fontSize, decreaseFontSize, increaseFontSize } = useFontSize();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

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
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
              <Sun className="h-5 w-5" /> Theme
            </h2>
          </CardHeader>
          <CardContent>
            <ThemeSelector currentThemeId={currentThemeId} onThemeChange={onThemeChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
              <Eye className="h-5 w-5" /> Accessibility
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Font Size</p>
                  <p className="text-xs text-muted-foreground">Adjust text size</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decreaseFontSize}
                  aria-label="Decrease font size"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-sm font-mono">{fontSize}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={increaseFontSize}
                  aria-label="Increase font size"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-medium text-sm">Reduced Motion</p>
                  <p className="text-xs text-muted-foreground">Minimize animations</p>
                </div>
              </div>
              <Switch
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
                aria-label="Reduced Motion"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-medium text-sm">High Contrast</p>
                  <p className="text-xs text-muted-foreground">Increase color contrast</p>
                </div>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={setHighContrast}
                aria-label="High Contrast"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
