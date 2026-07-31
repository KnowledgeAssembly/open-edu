import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { PipiliHeaderButton } from '../PipiliHeaderButton.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderButton(overrides: Partial<React.ComponentProps<typeof PipiliHeaderButton>> = {}) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <PipiliHeaderButton onOpen={vi.fn()} {...overrides} />
    </I18nProvider>,
  );
}

describe('PipiliHeaderButton', () => {
  it('renders the Pipili trigger button', () => {
    renderButton();
    expect(screen.getByRole('button', { name: 'Ask Pipili' })).toBeInTheDocument();
  });

  it('calls onOpen when the trigger is clicked', () => {
    const onOpen = vi.fn();
    renderButton({ onOpen });
    fireEvent.click(screen.getByRole('button', { name: 'Ask Pipili' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows the non-Mac shortcut hint in the tooltip', async () => {
    renderButton();
    fireEvent.focus(screen.getByRole('button', { name: 'Ask Pipili' }));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Ask Pipili (Ctrl⇧P)');
  });

  it('shows an unread indicator when hasUnread is true', () => {
    renderButton({ hasUnread: true });
    expect(screen.getByRole('img', { name: 'New messages' })).toBeInTheDocument();
  });

  it('hides the unread indicator when hasUnread is false', () => {
    renderButton({ hasUnread: false });
    expect(screen.queryByRole('img', { name: 'New messages' })).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderButton({ hasUnread: true });
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
