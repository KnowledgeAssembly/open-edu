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
import { Sun, Eye, Type, Minus, Plus, Languages } from 'lucide-react';
import { LanguageSwitcher, useTranslation } from '@open-edu/i18n';
export interface SettingsPageProps {
  currentThemeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  breakTimer: {
    mode: 'off' | '15' | '30' | '60';
    setMode: (mode: 'off' | '15' | '30' | '60') => void;
  };
}

export function SettingsPage({
  currentThemeId,
  onThemeChange,
  breakTimer,
}: SettingsPageProps): JSX.Element {
  const { fontSize, decreaseFontSize, increaseFontSize } = useFontSize();
  const { t } = useTranslation();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const el = document.querySelector('.open-edu-runtime');
    if (el) el.setAttribute('data-reduced-motion', reducedMotion ? 'reduce' : 'no-preference');
  }, [reducedMotion]);

  useEffect(() => {
    const el = document.querySelector('.open-edu-runtime');
    if (el) el.setAttribute('data-high-contrast', highContrast ? '1' : '0');
  }, [highContrast]);

  return (
    <div className="p-xl mx-auto max-w-3xl" data-testid="settings-page">
      <PageHeader
        eyebrow={t('learner.nav.settings')}
        title={t('learner.nav.settings')}
        className="mb-xl"
      />

      <div className="gap-lg flex flex-col">
        <Card>
          <CardHeader>
            <h2 className="text-h2 font-display flex items-center gap-2">
              <Sun className="h-5 w-5" /> {t('learner.settings.theme')}
            </h2>
          </CardHeader>
          <CardContent>
            <ThemeSelector currentThemeId={currentThemeId} onThemeChange={onThemeChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-h2 font-display flex items-center gap-2">
              <Languages className="h-5 w-5" /> {t('learner.settings.language')}
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-on-surface-variant text-body-ui">
              {t('learner.settings.language_description')}
            </p>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-h2 font-display flex items-center gap-2">
              <Eye className="h-5 w-5" /> {t('learner.settings.accessibility')}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="text-on-surface-variant h-4 w-4" />
                <div>
                  <p className="text-body-ui font-medium">{t('learner.settings.font_size')}</p>
                  <p className="text-on-surface-variant text-caption">
                    {t('learner.settings.font_size_description')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decreaseFontSize}
                  aria-label={t('learner.settings.aa_decrease_font_aria')}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-body-ui w-12 text-center font-mono">{fontSize}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={increaseFontSize}
                  aria-label={t('learner.settings.aa_increase_font_aria')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-body-ui font-medium">{t('learner.settings.reduced_motion')}</p>
                  <p className="text-on-surface-variant text-caption">
                    {t('learner.settings.reduced_motion_description')}
                  </p>
                </div>
              </div>
              <Switch
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
                aria-label={t('learner.settings.reduced_motion')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-body-ui font-medium">{t('learner.settings.high_contrast')}</p>
                  <p className="text-on-surface-variant text-caption">
                    {t('learner.settings.high_contrast_description')}
                  </p>
                </div>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={setHighContrast}
                aria-label={t('learner.settings.high_contrast')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-h2 font-display flex items-center gap-2">
              <Pipili size="sm" mood="content" /> {t('learner.settings.break_reminder')}
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
                <label htmlFor="break-off" className="text-body-ui">
                  <span className="font-medium">{t('learner.settings.break_off')}</span>
                  <p className="text-on-surface-variant text-caption">
                    {t('learner.settings.break_off_description')}
                  </p>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="15" id="break-15" />
                <label htmlFor="break-15" className="text-body-ui">
                  <span className="font-medium">{t('learner.settings.break_15')}</span>
                  <p className="text-on-surface-variant text-caption">
                    {t('learner.settings.break_15_description')}
                  </p>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="30" id="break-30" />
                <label htmlFor="break-30" className="text-body-ui">
                  <span className="font-medium">{t('learner.settings.break_30')}</span>
                  <p className="text-on-surface-variant text-caption">
                    {t('learner.settings.break_30_description')}
                  </p>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="60" id="break-60" />
                <label htmlFor="break-60" className="text-body-ui">
                  <span className="font-medium">{t('learner.settings.break_60')}</span>
                  <p className="text-on-surface-variant text-caption">
                    {t('learner.settings.break_60_description')}
                  </p>
                </label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
