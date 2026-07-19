import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdatePrompt } from '../components/UpdatePrompt.js';

describe('UpdatePrompt', () => {
  it('shows update notification when available', () => {
    render(<UpdatePrompt updateAvailable={true} onUpdate={vi.fn()} />);
    expect(screen.getByText(/new version/i)).toBeInTheDocument();
  });

  it('does not show when no update', () => {
    const { container } = render(<UpdatePrompt updateAvailable={false} onUpdate={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onUpdate when update button clicked', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<UpdatePrompt updateAvailable={true} onUpdate={onUpdate} />);

    await user.click(screen.getByRole('button', { name: /update/i }));
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<UpdatePrompt updateAvailable={true} onDismiss={onDismiss} onUpdate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
