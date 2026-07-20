import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BreakNagBar } from '../BreakNagBar';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('BreakNagBar', () => {
  it('renders the AppBanner with break variant', () => {
    renderWithProvider(<BreakNagBar mode="15" onTakeBreak={vi.fn()} onIgnore={vi.fn()} />);
    expect(screen.getByText('Time for a break!')).toBeInTheDocument();
  });

  it('renders Pipili in the icon slot', () => {
    renderWithProvider(<BreakNagBar mode="15" onTakeBreak={vi.fn()} onIgnore={vi.fn()} />);
    expect(screen.getByRole('img', { name: /Pipili/i })).toHaveAttribute(
      'aria-label',
      'Pipili — curious',
    );
  });

  it('renders Take Break and Ignore buttons', () => {
    renderWithProvider(<BreakNagBar mode="15" onTakeBreak={vi.fn()} onIgnore={vi.fn()} />);
    expect(screen.getByText('Take Break')).toBeInTheDocument();
    expect(screen.getByText('Ignore')).toBeInTheDocument();
  });

  it('clicking Take Break calls onTakeBreak', () => {
    const onTakeBreak = vi.fn();
    renderWithProvider(<BreakNagBar mode="15" onTakeBreak={onTakeBreak} onIgnore={vi.fn()} />);
    fireEvent.click(screen.getByText('Take Break'));
    expect(onTakeBreak).toHaveBeenCalledTimes(1);
  });

  it('clicking Ignore calls onIgnore', () => {
    const onIgnore = vi.fn();
    renderWithProvider(<BreakNagBar mode="15" onTakeBreak={vi.fn()} onIgnore={onIgnore} />);
    fireEvent.click(screen.getByText('Ignore'));
    expect(onIgnore).toHaveBeenCalledTimes(1);
  });

  it('renders the elapsed time in the message', () => {
    renderWithProvider(<BreakNagBar mode="30" onTakeBreak={vi.fn()} onIgnore={vi.fn()} />);
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const axe = await import('axe-core');
    const { container } = renderWithProvider(
      <BreakNagBar mode="15" onTakeBreak={vi.fn()} onIgnore={vi.fn()} />,
    );
    const results = await axe.default.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
