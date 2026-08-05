import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { ModeToggle } from './ModeToggle';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

describe('ModeToggle', () => {
  it('calls onChange when switching to developer', async () => {
    const onChange = vi.fn();
    render(wrap(<ModeToggle mode="creator" onChange={onChange} />));
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(onChange).toHaveBeenCalledWith('developer');
  });

  it('calls onChange when switching back to creator', async () => {
    const onChange = vi.fn();
    render(wrap(<ModeToggle mode="developer" onChange={onChange} />));
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(onChange).toHaveBeenCalledWith('creator');
  });

  it('renders creator and developer labels', () => {
    render(wrap(<ModeToggle mode="creator" onChange={() => {}} />));
    expect(screen.getByText('Creator')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('forwards tabIndex to the switch', () => {
    render(wrap(<ModeToggle mode="creator" onChange={() => {}} tabIndex={-1} />));
    expect(screen.getByRole('switch', { name: /studio mode/i })).toHaveAttribute('tabindex', '-1');
  });
});
