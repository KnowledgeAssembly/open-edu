import { render } from '@testing-library/react';

export async function checkAccessibility(ui: React.ReactElement): Promise<void> {
  const { container } = render(ui);
  const axe = await import('axe-core');
  const results = await axe.default.run(container);
  if (results.violations.length > 0) {
    const messages = results.violations.map(
      (v) => `${v.id}: ${v.description} (${v.nodes.length} nodes)`,
    );
    throw new Error(`Accessibility violations detected:\n${messages.join('\n')}`);
  }
}
