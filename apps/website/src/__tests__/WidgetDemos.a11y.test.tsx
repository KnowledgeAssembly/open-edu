import { Suspense, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { TryWidgets } from '../components/sections/TryWidgets';
import { HotspotDemo } from '../ui/demos/HotspotDemo';
import { ImageCompareDemo } from '../ui/demos/ImageCompareDemo';
import { LabelDiagramDemo } from '../ui/demos/LabelDiagramDemo';
import { QuizDemo } from '../ui/demos/QuizDemo';
import { TimelineDemo } from '../ui/demos/TimelineDemo';
import { dictionaries } from '../i18n-dictionaries';

async function expectNoViolations(container: HTMLElement): Promise<void> {
  const result = await axe.run(container);
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

function renderWithProviders(demo: ReactNode): HTMLElement {
  const { container } = render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <Suspense fallback={null}>{demo}</Suspense>
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
  return container;
}

describe('Widget demos accessibility', () => {
  it('TryWidgets section has no axe violations', async () => {
    const container = renderWithProviders(<TryWidgets />);
    await screen.findByText('2 + 3 = ?');
    await expectNoViolations(container);
  });

  it('QuizDemo has no axe violations in its initial state', async () => {
    const container = renderWithProviders(<QuizDemo />);
    await expectNoViolations(container);
  });

  it('TimelineDemo has no axe violations in its initial state', async () => {
    const container = renderWithProviders(<TimelineDemo />);
    await expectNoViolations(container);
  });

  it('ImageCompareDemo has no axe violations in its initial state', async () => {
    const container = renderWithProviders(<ImageCompareDemo />);
    await expectNoViolations(container);
  });

  it('HotspotDemo has no axe violations in its initial state', async () => {
    const container = renderWithProviders(<HotspotDemo />);
    await expectNoViolations(container);
  });

  it('LabelDiagramDemo has no axe violations in its initial state', async () => {
    const container = renderWithProviders(<LabelDiagramDemo />);
    await expectNoViolations(container);
  });
});
