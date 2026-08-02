import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it } from 'vitest';
import { TryWidgets } from '../components/sections/TryWidgets';
import { dictionaries } from '../i18n-dictionaries';

const WIDGET_CARD_TITLES = ['Quiz', 'Timeline', 'Image Compare', 'Hotspot', 'Label Diagram'];

function renderSection(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <Suspense fallback={null}>
          <TryWidgets />
        </Suspense>
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('TryWidgets', () => {
  it('renders the eyebrow, title, and subtitle', () => {
    renderSection();
    expect(screen.getByText('Playground')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Try interactive widgets in seconds' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Every lesson can embed live activities/)).toBeInTheDocument();
  });

  it('renders all 5 widget card titles', () => {
    renderSection();
    WIDGET_CARD_TITLES.forEach((title) => {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    });
  });

  it('lazy-loads the demo components inside each card', async () => {
    renderSection();
    expect(await screen.findByText('2 + 3 = ?')).toBeInTheDocument();
    expect(await screen.findByText('Select a year to explore.')).toBeInTheDocument();
    expect(await screen.findByRole('slider', { name: 'Drag to compare' })).toBeInTheDocument();
    expect(await screen.findByText('Tap a pin to learn more.')).toBeInTheDocument();
    expect(
      await screen.findByText('Drag each label to the correct part of the flower.'),
    ).toBeInTheDocument();
  });
});
