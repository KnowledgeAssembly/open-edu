import { Outlet } from 'react-router-dom';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider, useThemePreference } from '@open-edu/runtime';
import { dictionaries } from './i18n-dictionaries';

export function App(): JSX.Element {
  const [themeId] = useThemePreference();

  return (
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId={themeId}>
        <div className="open-edu-runtime min-h-screen">
          <Outlet />
        </div>
      </RuntimeThemeProvider>
    </I18nProvider>
  );
}
