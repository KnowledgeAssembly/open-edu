import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from './language-switcher.js';
import { I18nProvider } from './context.js';

const Dictionaries = {
  en: { runtime: {} },
  hi: { runtime: {} },
};

function renderSwitcher(locale: string = 'en', supportedLocales = ['en', 'hi'] as const) {
  return render(
    <I18nProvider
      locale={locale as any}
      dictionaries={Dictionaries}
      supportedLocales={supportedLocales}
    >
      <LanguageSwitcher supportedLocales={supportedLocales} />
    </I18nProvider>
  );
}

describe('LanguageSwitcher', () => {
  it('renders a button for each supported locale', () => {
    renderSwitcher();
    expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /हिन्दी/ })).toBeInTheDocument();
  });

  it('highlights the current locale', () => {
    renderSwitcher();
    const enButton = screen.getByRole('button', { name: /english/i });
    expect(enButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches locale when a button is clicked', () => {
    renderSwitcher();
    const hiButton = screen.getByRole('button', { name: /हिन्दी/ });
    fireEvent.click(hiButton);
    expect(hiButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('persists locale to localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी/ }));
    expect(setItemSpy).toHaveBeenCalledWith('open-edu-locale', 'hi');
    setItemSpy.mockRestore();
  });
});
