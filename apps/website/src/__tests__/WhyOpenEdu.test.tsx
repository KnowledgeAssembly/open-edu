import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it } from 'vitest';
import { WhyOpenEdu } from '../components/sections/WhyOpenEdu';
import { dictionaries } from '../i18n-dictionaries';

function renderSection(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <WhyOpenEdu />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('WhyOpenEdu', () => {
  it('renders the section title', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'A platform built for the way kids actually learn' }),
    ).toBeInTheDocument();
  });

  it('renders all 6 feature card titles', () => {
    renderSection();
    const titles = [
      'Interactive by default',
      'Works offline',
      'A friendly AI companion',
      'Open source, open formats',
      'Accessible by design',
      'Global and multilingual',
    ];
    titles.forEach((title) => {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    });
  });
});
