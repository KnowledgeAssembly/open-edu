import { render } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { PrismLessonCard } from '../ui/PrismLessonCard';
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

describe('PrismLessonCard accessibility', () => {
  it('has no axe violations in its initial state', async () => {
    const container = renderCard();
    await expectNoViolations(container);
  });

  it('has no axe violations after tiles are placed and feedback is shown', async () => {
    const container = renderCard();
    const roygbiv = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'];
    roygbiv.forEach((color, index) => {
      const tile = container.querySelector<HTMLButtonElement>(`[aria-label="${color} tile"]`);
      tile?.click();
      const slot = container.querySelector<HTMLButtonElement>(`[aria-label="Slot ${index + 1}"]`);
      slot?.click();
    });
    const check = container.querySelector<HTMLButtonElement>('[aria-label="Check Answer"]');
    check?.click();
    await expectNoViolations(container);
  });
});
