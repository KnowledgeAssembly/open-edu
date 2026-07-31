import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { ReaderToolbar } from '../ReaderToolbar.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderToolbar(overrides: Partial<React.ComponentProps<typeof ReaderToolbar>> = {}) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <ReaderToolbar onOpen={vi.fn()} {...overrides} />
    </I18nProvider>,
  );
}

describe('ReaderToolbar', () => {
  it('renders the Pipili trigger button', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Ask Pipili' })).toBeInTheDocument();
  });

  it('renders the non-Mac shortcut hint in jsdom', () => {
    renderToolbar();
    expect(screen.getByText('Ctrl⇧P')).toBeInTheDocument();
  });

  it('calls onOpen when the trigger is clicked', () => {
    const onOpen = vi.fn();
    renderToolbar({ onOpen });
    fireEvent.click(screen.getByRole('button', { name: 'Ask Pipili' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows an unread indicator when hasUnread is true', () => {
    renderToolbar({ hasUnread: true });
    expect(screen.getByRole('img', { name: 'New messages' })).toBeInTheDocument();
  });

  it('hides the unread indicator when hasUnread is false', () => {
    renderToolbar({ hasUnread: false });
    expect(screen.queryByRole('img', { name: 'New messages' })).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderToolbar({ hasUnread: true });
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
