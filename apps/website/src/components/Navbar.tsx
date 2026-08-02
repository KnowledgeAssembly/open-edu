import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Leaf, Menu, Moon, Star, Sun, X, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { themeIds, type ThemeId } from '@open-edu/runtime';
import { Button, OpenEduLogo, cn } from '@open-edu/design-system';
import { GITHUB_URL } from '../config';

const GITHUB_STARS = '1.5k';

const themeIcons: Record<ThemeId, LucideIcon> = {
  'lumina-scholastica': Sun,
  nocturnal: Moon,
  zen: Leaf,
};

const themeLabelKeys: Record<ThemeId, string> = {
  'lumina-scholastica': 'website.nav.theme_light',
  nocturnal: 'website.nav.theme_dark',
  zen: 'website.nav.theme_zen',
};

const navItems: Array<{ to: string; labelKey: string }> = [
  { to: '/', labelKey: 'website.nav.home' },
  { to: '/courses', labelKey: 'website.nav.courses' },
  { to: '/widgets', labelKey: 'website.nav.widgets' },
  { to: '/docs', labelKey: 'website.nav.docs' },
  { to: '/community', labelKey: 'website.nav.community' },
];

export interface NavbarProps {
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

export function Navbar({ themeId, onThemeChange }: NavbarProps): JSX.Element {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const ThemeIcon = themeIcons[themeId];

  const handleThemeToggle = (): void => {
    const currentIndex = themeIds.indexOf(themeId);
    const nextThemeId = themeIds[(currentIndex + 1) % themeIds.length];
    if (nextThemeId) {
      onThemeChange(nextThemeId);
    }
  };

  const closeMenu = (): void => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeMenu();
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <header className="border-outline bg-surface/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center">
          <OpenEduLogo variant="lockup" size="sm" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-variant text-on-surface-variant'
                    : 'text-on-surface-variant hover:text-on-surface',
                )
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t('website.nav.github_stars', { count: GITHUB_STARS })}
            className="text-on-surface-variant hover:text-on-surface hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex"
          >
            <Star className="h-4 w-4" aria-hidden="true" />
            {t('website.nav.github_stars', { count: GITHUB_STARS })}
          </a>

          <button
            type="button"
            onClick={handleThemeToggle}
            aria-label={t('website.nav.theme_toggle')}
            className="text-on-surface-variant hover:bg-primary/10 hover:text-primary inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors"
          >
            <ThemeIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          <div role="status" aria-live="polite" className="sr-only">
            {t('website.nav.theme_switched', { theme: t(themeLabelKeys[themeId]) })}
          </div>

          <Button asChild size="sm" className="hidden lg:inline-flex">
            <Link to="/courses">{t('website.nav.get_started')}</Link>
          </Button>

          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? t('website.nav.close_menu') : t('website.nav.menu')}
            className="text-on-surface-variant hover:bg-primary/10 hover:text-primary inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors lg:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="animate-in fade-in slide-in-from-top-2 border-outline bg-surface/95 border-t px-4 pb-4 pt-2 lg:hidden"
        >
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-surface-variant text-on-surface-variant'
                        : 'text-on-surface-variant hover:text-on-surface',
                    )
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-3 w-full">
            <Link to="/courses" onClick={closeMenu}>
              {t('website.nav.get_started')}
            </Link>
          </Button>
        </div>
      )}
    </header>
  );
}
