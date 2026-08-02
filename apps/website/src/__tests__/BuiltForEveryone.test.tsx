import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it } from 'vitest';
import { BuiltForEveryone } from '../components/sections/BuiltForEveryone';
import { dictionaries } from '../i18n-dictionaries';

function renderSection(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <BuiltForEveryone />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('BuiltForEveryone', () => {
  it('renders the section title', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'Built for the whole learning village' }),
    ).toBeInTheDocument();
  });

  it('renders all 4 role titles', () => {
    renderSection();
    const titles = ['Learners', 'Educators', 'Parents', 'Developers'];
    titles.forEach((title) => {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    });
  });
});
