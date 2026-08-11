import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { DeveloperToolbar } from './DeveloperToolbar';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

describe('DeveloperToolbar', () => {
  it('renders Edit Package button and calls handler', async () => {
    const onEdit = vi.fn();
    const onReset = vi.fn();
    render(
      wrap(
        <DeveloperToolbar
          mode="developer"
          onModeChange={() => {}}
          onEdit={onEdit}
          onReset={onReset}
        />,
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: /edit package/i }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('renders Reset Progress button and calls handler', async () => {
    const onReset = vi.fn();
    render(wrap(<DeveloperToolbar mode="developer" onModeChange={() => {}} onReset={onReset} />));
    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it('renders Bundle Overview button when onOverview provided', () => {
    render(
      wrap(
        <DeveloperToolbar
          mode="developer"
          onModeChange={() => {}}
          onReset={vi.fn()}
          onOverview={() => {}}
        />,
      ),
    );
    expect(screen.getByRole('button', { name: /bundle overview/i })).toBeInTheDocument();
  });

  it('does not have any fixed-position class nodes', () => {
    const { container } = render(
      wrap(<DeveloperToolbar mode="developer" onModeChange={() => {}} onReset={vi.fn()} />),
    );
    const fixedElements = container.querySelectorAll('.fixed');
    expect(fixedElements.length).toBe(0);
  });

  it('renders mode toggle', () => {
    render(wrap(<DeveloperToolbar mode="creator" onModeChange={() => {}} onReset={vi.fn()} />));
    expect(screen.getByRole('switch', { name: /studio mode/i })).toBeInTheDocument();
  });
});
