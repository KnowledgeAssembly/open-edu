import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
import { UpdatePrompt } from '../components/UpdatePrompt';

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

describe('UpdatePrompt accessibility', () => {
  it('has no axe violations when update is available', async () => {
    const { container } = renderWithProviders(
      <UpdatePrompt
        updateAvailable={true}
        onUpdate={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    await expectNoViolations(container);
  });
});
