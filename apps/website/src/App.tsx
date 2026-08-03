import { Outlet } from 'react-router-dom';
import { I18nProvider, useTranslation } from '@open-edu/i18n';
import { RuntimeThemeProvider, useThemePreference, type ThemeId } from '@open-edu/runtime';
import { dictionaries } from './i18n-dictionaries';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

interface LayoutProps {
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

function Layout({ themeId, onThemeChange }: LayoutProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="open-edu-runtime flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="focus:bg-surface focus:text-on-surface sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:px-4 focus:py-2"
      >
        {t('website.nav.skip_to_content')}
      </a>
      <Navbar themeId={themeId} onThemeChange={onThemeChange} />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function App(): JSX.Element {
  const [themeId, setThemeId] = useThemePreference();

  return (
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId={themeId}>
        <Layout themeId={themeId} onThemeChange={setThemeId} />
      </RuntimeThemeProvider>
    </I18nProvider>
  );
}
