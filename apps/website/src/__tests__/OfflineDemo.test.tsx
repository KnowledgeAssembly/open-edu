import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it } from 'vitest';
import { OfflineDemo } from '../components/sections/OfflineDemo';
import { dictionaries } from '../i18n-dictionaries';

function renderDemo(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <OfflineDemo />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('OfflineDemo', () => {
  it('renders the section title, toggle label, and course content card', () => {
    renderDemo();

    expect(
      screen.getByRole('heading', { name: 'Full lessons with zero connection' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Simulate offline mode')).toBeInTheDocument();
    expect(screen.getByText('World of Atoms')).toBeInTheDocument();
    expect(screen.getByText('Lesson 3: Inside the atom')).toBeInTheDocument();
  });

  it('starts online', () => {
    renderDemo();

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Connected to the internet')).toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    expect(screen.queryByText('No connection needed')).not.toBeInTheDocument();
    expect(screen.queryByText('100% available offline')).not.toBeInTheDocument();
  });

  it('shows the offline state when toggled, keeping the course content card rendered', () => {
    renderDemo();

    fireEvent.click(screen.getByRole('switch'));

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('No connection needed')).toBeInTheDocument();
    expect(screen.getByText('100% available offline')).toBeInTheDocument();
    expect(screen.getByText('World of Atoms')).toBeInTheDocument();
    expect(screen.getByText('Lesson 3: Inside the atom')).toBeInTheDocument();
    expect(screen.queryByText('Connected to the internet')).not.toBeInTheDocument();
  });

  it('returns to the online state when toggled again', () => {
    renderDemo();

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Connected to the internet')).toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    expect(screen.queryByText('100% available offline')).not.toBeInTheDocument();
    expect(screen.getByText('World of Atoms')).toBeInTheDocument();
  });
});
