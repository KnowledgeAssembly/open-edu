import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider, type ThemeId } from '@open-edu/runtime';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from '../components/Navbar';
import { dictionaries } from '../i18n-dictionaries';

interface HarnessProps {
  onThemeChange?: (id: ThemeId) => void;
}

function Harness({ onThemeChange = () => {} }: HarnessProps): JSX.Element {
  const [themeId, setThemeId] = useState<ThemeId>('lumina-scholastica');
  const handleThemeChange = (id: ThemeId): void => {
    setThemeId(id);
    onThemeChange(id);
  };

  return (
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId={themeId}>
        <MemoryRouter>
          <Navbar themeId={themeId} onThemeChange={handleThemeChange} />
        </MemoryRouter>
      </RuntimeThemeProvider>
    </I18nProvider>
  );
}

const navLinkNames = ['Home', 'Courses', 'Widgets', 'Docs', 'Community'];

describe('Navbar', () => {
  it('renders all five nav links', () => {
    render(<Harness />);
    for (const name of navLinkNames) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('renders the theme toggle button', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Switch theme' })).toBeInTheDocument();
  });

  it('calls onThemeChange with the next theme id', () => {
    const onThemeChange = vi.fn();
    render(<Harness onThemeChange={onThemeChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch theme' }));
    expect(onThemeChange).toHaveBeenCalledWith('nocturnal');
  });

  it('cycles through the theme ids in order', () => {
    const onThemeChange = vi.fn();
    render(<Harness onThemeChange={onThemeChange} />);
    const toggle = screen.getByRole('button', { name: 'Switch theme' });

    fireEvent.click(toggle);
    expect(onThemeChange).toHaveBeenLastCalledWith('nocturnal');

    fireEvent.click(toggle);
    expect(onThemeChange).toHaveBeenLastCalledWith('zen');

    fireEvent.click(toggle);
    expect(onThemeChange).toHaveBeenLastCalledWith('lumina-scholastica');
  });

  it('toggles the mobile menu with the hamburger button', () => {
    render(<Harness />);
    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Courses' })).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the mobile menu when a link is clicked', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('link', { name: 'Courses' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('link', { name: 'Courses' })[1] as HTMLElement);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getAllByRole('link', { name: 'Courses' })).toHaveLength(1);
  });

  it('includes a Get Started CTA in the mobile menu', () => {
    render(<Harness />);
    expect(screen.getAllByRole('link', { name: 'Get Started' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('link', { name: 'Get Started' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('link', { name: 'Get Started' })[1] as HTMLElement);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the mobile menu on Escape and returns focus to the hamburger button', () => {
    render(<Harness />);
    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(hamburger).toHaveFocus();
  });

  it('does not listen for Escape when the mobile menu is closed', () => {
    render(<Harness />);
    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });
});
