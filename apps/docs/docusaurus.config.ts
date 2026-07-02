import type { Options as PresetOptions } from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';

const config: Config = {
  title: 'Open-Edu Framework',
  tagline: 'An open runtime for educational experiences',
  favicon: 'img/favicon.ico',
  url: 'https://spatnaik1982.github.io',
  baseUrl: '/open-edu/',
  organizationName: 'spatnaik1982',
  projectName: 'open-edu',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars'),
          editUrl: undefined,
        },
        blog: false,
        pages: {
          path: 'src/pages',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      } satisfies PresetOptions,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Open-Edu',
      logo: {
        alt: 'Open-Edu Logo',
        src: 'img/logo.svg',
      },
      items: [
        { to: '/docs/intro', label: 'Docs', position: 'left' },
        { to: '/docs/openedu-way', label: 'The OpenEdu Way', position: 'left' },
        { to: '/docs/architecture', label: 'Architecture', position: 'left' },
        { to: '/docs/package-format', label: 'Package Format', position: 'left' },
        {
          href: 'https://github.com/spatnaik1982/open-edu',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'The OpenEdu Way', to: '/docs/openedu-way' },
            { label: 'Architecture', to: '/docs/architecture' },
            { label: 'Package Format', to: '/docs/package-format' },
            { label: 'Package Authoring Guide', to: '/docs/package-authoring' },
          ],
        },
        {
          title: 'Community',
          items: [{ label: 'GitHub', href: 'https://github.com/spatnaik1982/open-edu' }],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Open-Edu Contributors. Built with Docusaurus.`,
    },
  } satisfies import('@docusaurus/preset-classic').ThemeConfig,
};

export default config;
