import { useState, useEffect } from 'react';
import { ThemeSelector, type ThemeId } from '@open-edu/runtime';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  PageHeader,
  Switch,
  useFontSize,
  RadioGroup,
  RadioGroupItem,
  Pipili,
} from '@open-edu/design-system';
import { Sun, Eye, Type, Minus, Plus } from 'lucide-react';
export interface SettingsPageProps {
  currentThemeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  breakTimer: {
    mode: 'off' | '15' | '30' | '60';
    setMode: (mode: 'off' | '15' | '30' | '60') => void;
  };
}

export function SettingsPage({ currentThemeId, onThemeChange, breakTimer }: SettingsPageProps): JSX.Element {
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
    <div className="p-xl mx-auto max-w-3xl" data-testid="settings-page">
      <PageHeader eyebrow="Settings" title="Settings" className="mb-xl" />

      <div className="gap-lg flex flex-col">
        <Card>
          <CardHeader>
            <h2 className="text-h2 font-display flex items-center gap-2">
              <Sun className="h-5 w-5" /> Theme
            </h2>
          </CardHeader>
          <CardContent>
            <ThemeSelector currentThemeId={currentThemeId} onThemeChange={onThemeChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-h2 font-display flex items-center gap-2">
              <Eye className="h-5 w-5" /> Accessibility
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="text-on-surface-variant h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Font Size</p>
                  <p className="text-on-surface-variant text-xs">Adjust text size</p>
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
                <span className="w-12 text-center font-mono text-sm">{fontSize}%</span>
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
                  <p className="text-sm font-medium">Reduced Motion</p>
                  <p className="text-on-surface-variant text-xs">Minimize animations</p>
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
                  <p className="text-sm font-medium">High Contrast</p>
                  <p className="text-on-surface-variant text-xs">Increase color contrast</p>
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

        <Card>
          <CardHeader>
            <h2 className="text-h2 font-display flex items-center gap-2">
              <Pipili size="sm" mood="content" /> Break Reminder
            </h2>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={breakTimer.mode}
              onValueChange={(value) => breakTimer.setMode(value as 'off' | '15' | '30' | '60')}
              className="gap-3"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="off" id="break-off" />
                <label htmlFor="break-off" className="text-sm">
                  <span className="font-medium">Off</span>
                  <p className="text-on-surface-variant text-xs">No break reminders</p>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="15" id="break-15" />
                <label htmlFor="break-15" className="text-sm">
                  <span className="font-medium">15 min</span>
                  <p className="text-on-surface-variant text-xs">Quick learning sprints</p>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="30" id="break-30" />
                <label htmlFor="break-30" className="text-sm">
                  <span className="font-medium">30 min</span>
                  <p className="text-on-surface-variant text-xs">
                    Balanced sessions with regular breaks
                  </p>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="60" id="break-60" />
                <label htmlFor="break-60" className="text-sm">
                  <span className="font-medium">60 min</span>
                  <p className="text-on-surface-variant text-xs">Deep work sessions</p>
                </label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
