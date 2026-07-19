import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
import { StorageUsageCard } from '../components/StorageUsageCard';

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

describe('StorageUsageCard accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderWithProviders(
      <StorageUsageCard usage={1024 * 1024} quota={1024 * 1024 * 100} />,
    );
    await expectNoViolations(container);
  });

  it('has no axe violations at zero usage', async () => {
    const { container } = renderWithProviders(
      <StorageUsageCard usage={0} quota={1024 * 1024 * 100} />,
    );
    await expectNoViolations(container);
  });
});
