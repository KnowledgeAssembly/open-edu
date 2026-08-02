import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { Navbar } from '../components/Navbar';
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

function renderNavbar(): HTMLElement {
  const { container } = render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <MemoryRouter>
          <Navbar themeId="lumina-scholastica" onThemeChange={() => {}} />
        </MemoryRouter>
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
  return container;
}

describe('Navbar accessibility', () => {
  it('has no axe violations with the mobile menu closed', async () => {
    const container = renderNavbar();
    await expectNoViolations(container);
  });

  it('has no axe violations with the mobile menu open', async () => {
    const container = renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await expectNoViolations(container);
  });
});
