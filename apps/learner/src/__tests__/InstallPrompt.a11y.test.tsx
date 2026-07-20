import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
import { InstallPrompt } from '../components/InstallPrompt';

function renderWithProviders(ui: React.ReactElement) {
  return render(
      <RuntimeThemeProvider themeId="lumina-scholastica">
      <FontSizeProvider>{ui}</FontSizeProvider>
    </RuntimeThemeProvider>,
  );
}

async function expectNoViolations(container: HTMLElement) {
  const result = await axe.run(container);
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

describe('InstallPrompt accessibility', () => {
  it('has no axe violations when installable', async () => {
    const { container } = renderWithProviders(
      <InstallPrompt
        isInstallable={true}
        isInstalled={false}
        onInstall={vi.fn()}
      />,
    );
    await expectNoViolations(container);
  });
});
