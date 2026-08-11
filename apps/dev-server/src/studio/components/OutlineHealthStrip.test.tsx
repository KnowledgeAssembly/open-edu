import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { OutlineHealthStrip } from './OutlineHealthStrip';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

describe('OutlineHealthStrip', () => {
  it('renders the count and "Ready to share" when ready is true', () => {
    render(wrap(<OutlineHealthStrip count={3} ready onShare={() => {}} />));
    expect(screen.getByText('3 activities')).toBeInTheDocument();
    expect(screen.getByText('Ready to share')).toBeInTheDocument();
  });

  it('renders "Review ready check" when ready is false', () => {
    render(wrap(<OutlineHealthStrip count={2} ready={false} onShare={() => {}} />));
    expect(screen.getByText('Review ready check')).toBeInTheDocument();
  });

  it('clicking the Share button calls onShare once', async () => {
    const onShare = vi.fn();
    render(wrap(<OutlineHealthStrip count={1} ready onShare={onShare} />));
    await userEvent.click(screen.getByRole('button', { name: /share/i }));
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
