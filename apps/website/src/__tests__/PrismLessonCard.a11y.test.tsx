import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { PrismLessonCard } from '../ui/PrismLessonCard';
import { dictionaries } from '../i18n-dictionaries';

const ROYGBIV = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'];

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

function renderCard(): HTMLElement {
  const { container } = render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <PrismLessonCard />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
  return container;
}

function placeOrder(order: string[]): void {
  order.forEach((color, index) => {
    fireEvent.click(screen.getByRole('button', { name: `${color} tile` }));
    fireEvent.click(screen.getByRole('button', { name: `Slot ${index + 1}` }));
  });
}

describe('PrismLessonCard accessibility', () => {
  it('has no axe violations in its initial state', async () => {
    const container = renderCard();
    await expectNoViolations(container);
  });

  it('has no axe violations when success feedback is shown', async () => {
    const container = renderCard();
    placeOrder(ROYGBIV);
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    await expectNoViolations(container);
  });

  it('has no axe violations when error feedback is shown', async () => {
    const container = renderCard();
    placeOrder([...ROYGBIV].reverse());
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    await expectNoViolations(container);
  });
});
