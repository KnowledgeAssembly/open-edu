import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dictionaries } from '../i18n-dictionaries';
import { HomePage } from '../routes/HomePage';

const SECTION_HEADINGS = [
  'Learning that adapts to every child',
  'A platform built for the way kids actually learn',
  'Discover a course for every curiosity',
  'Try interactive widgets in seconds',
  'A learning companion that never runs out of patience',
  'Full lessons with zero connection',
  'Built for the whole learning village',
  'Grown in the open, for the open',
  'Ready to make learning spark?',
];

function renderHomePage(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('HomePage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders every landing page section heading', () => {
    renderHomePage();
    SECTION_HEADINGS.forEach((heading) => {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    });
  });

  it('renders exactly one h1 on the page', () => {
    renderHomePage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders without console errors', () => {
    const spy = vi.spyOn(console, 'error');
    renderHomePage();
    expect(spy).not.toHaveBeenCalled();
  });
});
