import { Link } from 'react-router-dom';
import { useTranslation } from '@open-edu/i18n';
import { GITHUB_URL } from '../config';

interface FooterLink {
  labelKey: string;
  to?: string;
  href?: string;
}

interface FooterColumn {
  headingKey: string;
  links: FooterLink[];
}

const columns: FooterColumn[] = [
  {
    headingKey: 'website.footer.product',
    links: [
      { labelKey: 'website.footer.features', href: '#' },
      { labelKey: 'website.footer.widgets', to: '/widgets' },
      { labelKey: 'website.footer.pricing', href: '#' },
    ],
  },
  {
    headingKey: 'website.footer.resources',
    links: [
      { labelKey: 'website.footer.docs', to: '/docs' },
      { labelKey: 'website.footer.api', href: '#' },
      { labelKey: 'website.footer.github', href: GITHUB_URL },
    ],
  },
  {
    headingKey: 'website.footer.community',
    links: [
      { labelKey: 'website.footer.discord', href: '#' },
      { labelKey: 'website.footer.twitter', href: '#' },
      { labelKey: 'website.footer.blog', href: '#' },
    ],
  },
  {
    headingKey: 'website.footer.legal',
    links: [
      { labelKey: 'website.footer.privacy', href: '#' },
      { labelKey: 'website.footer.terms', href: '#' },
      { labelKey: 'website.footer.license', href: '#' },
    ],
  },
];

export function Footer(): JSX.Element {
  const { t } = useTranslation();

  return (
    <footer className="border-outline bg-surface-variant border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-on-surface-variant text-sm">{t('website.footer.tagline')}</p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <div key={column.headingKey}>
              <h2 className="text-on-surface text-sm font-semibold">{t(column.headingKey)}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.labelKey}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-on-surface-variant hover:text-on-surface text-sm transition-colors"
                      >
                        {t(link.labelKey)}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        {...(link.href === GITHUB_URL
                          ? { target: '_blank', rel: 'noreferrer' }
                          : {})}
                        className="text-on-surface-variant hover:text-on-surface text-sm transition-colors"
                      >
                        {t(link.labelKey)}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-outline text-on-surface-variant mt-12 border-t pt-6 text-sm">
          {t('website.footer.copyright', { year: String(new Date().getFullYear()) })}
        </div>
      </div>
    </footer>
  );
}
