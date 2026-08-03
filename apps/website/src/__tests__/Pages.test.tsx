import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { GITHUB_URL } from '../config';
import { CommunityPage } from '../routes/CommunityPage';
import { CoursesPage } from '../routes/CoursesPage';
import { DocsPage } from '../routes/DocsPage';
import { WidgetsPage } from '../routes/WidgetsPage';
import { dictionaries } from '../i18n-dictionaries';

function renderPage(page: JSX.Element): void {
  render(
    <MemoryRouter>
      <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
        <RuntimeThemeProvider themeId="lumina-scholastica">{page}</RuntimeThemeProvider>
      </I18nProvider>
    </MemoryRouter>,
  );
}

async function expectNoViolations(container: HTMLElement): Promise<void> {
  const result = await axe.run(container);
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

describe('CoursesPage', () => {
  it('renders the page title and subtitle', () => {
    renderPage(<CoursesPage />);
    expect(screen.getByRole('heading', { name: 'Explore Courses' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Browse the full OpenEdu catalog. Detailed course listings are coming soon.',
      ),
    ).toBeInTheDocument();
  });

  it('has exactly one h1', () => {
    renderPage(<CoursesPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('WidgetsPage', () => {
  it('renders the page title and subtitle', () => {
    renderPage(<WidgetsPage />);
    expect(screen.getByRole('heading', { name: 'Widgets Playground' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'A full widget gallery is on the way. Try the interactive demos on the homepage meanwhile.',
      ),
    ).toBeInTheDocument();
  });

  it('has exactly one h1', () => {
    renderPage(<WidgetsPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('DocsPage', () => {
  it('renders the page title and subtitle', () => {
    renderPage(<DocsPage />);
    expect(screen.getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByText('Everything you need to build with OpenEdu.')).toBeInTheDocument();
  });

  it('renders a docs link to the GitHub repository', () => {
    renderPage(<DocsPage />);
    const link = screen.getByRole('link', { name: 'Read the docs →' });
    expect(link).toHaveAttribute('href', GITHUB_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('has exactly one h1', () => {
    renderPage(<DocsPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('CommunityPage', () => {
  it('renders the page title and subtitle', () => {
    renderPage(<CommunityPage />);
    expect(screen.getByRole('heading', { name: 'Community' })).toBeInTheDocument();
    expect(
      screen.getByText('Join the conversation, share lessons, and help build OpenEdu.'),
    ).toBeInTheDocument();
  });

  it('renders a GitHub link to join the community', () => {
    renderPage(<CommunityPage />);
    const link = screen.getByRole('link', { name: 'Join us on GitHub' });
    expect(link).toHaveAttribute('href', GITHUB_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('has exactly one h1', () => {
    renderPage(<CommunityPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('Secondary pages accessibility', () => {
  it('has no axe violations across all four pages', async () => {
    const pages = [<CoursesPage />, <WidgetsPage />, <DocsPage />, <CommunityPage />];
    for (const page of pages) {
      const { container } = render(
        <MemoryRouter>
          <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
            <RuntimeThemeProvider themeId="lumina-scholastica">{page}</RuntimeThemeProvider>
          </I18nProvider>
        </MemoryRouter>,
      );
      await expectNoViolations(container);
    }
  });
});
