import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it } from 'vitest';
import { InteractiveHero } from '../components/sections/InteractiveHero';
import { dictionaries } from '../i18n-dictionaries';

function renderHero(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <MemoryRouter>
          <InteractiveHero />
        </MemoryRouter>
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('InteractiveHero', () => {
  it('renders the eyebrow, headline, and subtitle', () => {
    renderHero();
    expect(screen.getByText('Open learning, reimagined')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Learning that adapts to every child' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/OpenEdu brings interactive lessons/)).toBeInTheDocument();
  });

  it('wires Start Learning to the learner app URL', () => {
    renderHero();
    const start = screen.getByRole('link', { name: 'Start Learning' });
    expect(start).toHaveAttribute('href', 'http://localhost:4001');
  });

  it('wires Explore Courses to the /courses route', () => {
    renderHero();
    const explore = screen.getByRole('link', { name: 'Explore Courses' });
    expect(explore).toHaveAttribute('href', '/courses');
  });

  it('renders the prism lesson card and the try-it-now callout', () => {
    renderHero();
    expect(screen.getByText('Try it now')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Order the colors of a rainbow' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Answer' })).toBeInTheDocument();
  });
});
