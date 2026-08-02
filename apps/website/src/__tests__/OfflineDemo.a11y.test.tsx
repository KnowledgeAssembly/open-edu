import { render } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { OfflineDemo } from '../components/sections/OfflineDemo';
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

describe('OfflineDemo accessibility', () => {
  it('has no axe violations in its initial state', async () => {
    const { container } = render(
      <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
        <RuntimeThemeProvider themeId="lumina-scholastica">
          <OfflineDemo />
        </RuntimeThemeProvider>
      </I18nProvider>,
    );
    await expectNoViolations(container);
  });
});
