import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { I18nProvider, useTranslation } from './context.js';

function TestComponent() {
  const { locale, setLocale, direction, t } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="direction">{direction}</span>
      <span data-testid="translated">{t('runtime.loading')}</span>
      <button onClick={() => setLocale('hi')}>Switch</button>
    </div>
  );
}

function NoProviderComponent() {
  const { t } = useTranslation();
  return <span>{t('a')}</span>;
}

const Dictionaries = {
  en: {
    runtime: { loading: 'Loading…' },
  },
  hi: {
    runtime: { loading: 'लोड हो रहा है…' },
  },
};

describe('I18nProvider', () => {
  it('provides the default locale', () => {
    render(
      <I18nProvider locale="en" dictionaries={Dictionaries} supportedLocales={['en', 'hi']}>
        <TestComponent />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
  });

  it('provides ltr direction for English', () => {
    render(
      <I18nProvider locale="en" dictionaries={Dictionaries} supportedLocales={['en', 'hi']}>
        <TestComponent />
      </I18nProvider>,
    );
    expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
  });

  it('translates keys using the current locale', () => {
    render(
      <I18nProvider locale="en" dictionaries={Dictionaries} supportedLocales={['en', 'hi']}>
        <TestComponent />
      </I18nProvider>,
    );
    expect(screen.getByTestId('translated')).toHaveTextContent('Loading…');
  });

  it('switches locale at runtime', async () => {
    render(
      <I18nProvider locale="en" dictionaries={Dictionaries} supportedLocales={['en', 'hi']}>
        <TestComponent />
      </I18nProvider>,
    );
    await act(async () => {
      screen.getByText('Switch').click();
    });
    expect(screen.getByTestId('locale')).toHaveTextContent('hi');
    expect(screen.getByTestId('translated')).toHaveTextContent('लोड हो रहा है…');
  });

  it('sets html lang attribute', () => {
    render(
      <I18nProvider locale="hi" dictionaries={Dictionaries} supportedLocales={['en', 'hi']}>
        <TestComponent />
      </I18nProvider>,
    );
    expect(document.documentElement.lang).toBe('hi');
  });

  it('returns defaults when used outside provider', () => {
    render(<NoProviderComponent />);
    expect(screen.getByText('a')).toBeInTheDocument();
  });
});
