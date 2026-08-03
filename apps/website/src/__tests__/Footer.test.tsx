import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@open-edu/i18n';
import { describe, expect, it } from 'vitest';
import { Footer } from '../components/Footer';
import { dictionaries } from '../i18n-dictionaries';

function renderFooter(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('Footer', () => {
  it('renders the four column headings', () => {
    renderFooter();
    expect(screen.getByRole('heading', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Community' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Legal' })).toBeInTheDocument();
  });

  it('renders key links from each column', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Features' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Widgets' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Discord' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'License' })).toBeInTheDocument();
  });

  it('shows the current year in the copyright', () => {
    renderFooter();
    const year = String(new Date().getFullYear());
    expect(
      screen.getByText(`© ${year} OpenEdu. Built for learners everywhere.`),
    ).toBeInTheDocument();
  });
});
