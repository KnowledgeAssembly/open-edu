import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdatePrompt } from '../components/UpdatePrompt.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('UpdatePrompt', () => {
  it('shows update notification when available', () => {
    renderWithProvider(<UpdatePrompt updateAvailable={true} onUpdate={vi.fn()} />);
    expect(screen.getByText(/new version/i)).toBeInTheDocument();
  });

  it('does not show when no update', () => {
    const { container } = renderWithProvider(<UpdatePrompt updateAvailable={false} onUpdate={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onUpdate when update button clicked', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    renderWithProvider(<UpdatePrompt updateAvailable={true} onUpdate={onUpdate} />);

    await user.click(screen.getByRole('button', { name: /update/i }));
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    renderWithProvider(<UpdatePrompt updateAvailable={true} onDismiss={onDismiss} onUpdate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
