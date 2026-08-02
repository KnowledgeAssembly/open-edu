import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it } from 'vitest';
import { LEARNER_APP_URL } from '../config';
import { GetStartedCTA } from '../components/sections/GetStartedCTA';
import { dictionaries } from '../i18n-dictionaries';

function renderSection(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <GetStartedCTA />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('GetStartedCTA', () => {
  it('renders the heading and subtext', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'Ready to make learning spark?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Open the learner app and start exploring courses right now — free, forever.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the CTA link to the learner app', () => {
    renderSection();
    const ctaLink = screen.getByRole('link', { name: 'Start Learning Now →' });
    expect(ctaLink).toHaveAttribute('href', LEARNER_APP_URL);
  });
});
