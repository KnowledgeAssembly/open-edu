import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GITHUB_URL } from '../config';
import { OpenSourceCommunity } from '../components/sections/OpenSourceCommunity';
import { dictionaries } from '../i18n-dictionaries';

function renderSection(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <OpenSourceCommunity />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('OpenSourceCommunity', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the section title', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'Grown in the open, for the open' }),
    ).toBeInTheDocument();
  });

  it('renders both GitHub buttons linking to the repository', () => {
    renderSection();
    const starLink = screen.getByRole('link', { name: 'Star on GitHub' });
    const contributeLink = screen.getByRole('link', { name: 'Start contributing' });
    expect(starLink).toHaveAttribute('href', GITHUB_URL);
    expect(starLink).toHaveAttribute('target', '_blank');
    expect(starLink).toHaveAttribute('rel', 'noreferrer');
    expect(contributeLink).toHaveAttribute('href', GITHUB_URL);
    expect(contributeLink).toHaveAttribute('target', '_blank');
    expect(contributeLink).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders all 4 stat labels', () => {
    renderSection();
    ['Contributors', 'Packages', 'Courses', 'GitHub stars'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('animates the stat counters to their final formatted values', () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
    renderSection();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    ['120+', '85+', '50+', '15k+'].forEach((value) => {
      expect(screen.getByText(value)).toBeInTheDocument();
    });
  });
});
