import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomePage } from './HomePage';
import { I18nProvider } from '@open-edu/i18n';
import { getInstallState } from '@open-edu/pwa-core';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../badgesStorage', () => ({
  getAllBadges: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../bundleProgressStorage', () => ({
  getAllBundleProgress: vi.fn(() => ({})),
}));

vi.mock('@open-edu/pwa-core', () => ({
  getInstallState: vi.fn().mockReturnValue({
    isInstallable: false,
    isInstalled: false,
    platform: 'desktop',
  }),
  promptInstall: vi.fn().mockResolvedValue({ outcome: 'dismissed' }),
}));

describe('HomePage', () => {
  it('renders welcome heading', () => {
    renderWithProvider(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getByText('Welcome back, Learner')).toBeInTheDocument();
  });

  it('renders summary stats with default zero counts', () => {
    renderWithProvider(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getAllByText('0')).toHaveLength(3);
    expect(screen.getByText('courses')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    expect(screen.getByText('badges')).toBeInTheDocument();
  });

  it('renders Begin Learning button', () => {
    renderWithProvider(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getByText('Begin Learning')).toBeInTheDocument();
  });

  it('renders quick link buttons', () => {
    renderWithProvider(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getByText('Browse Courses')).toBeInTheDocument();
    expect(screen.getByText('View Progress')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('calls onNavigate when Browse Courses is clicked', () => {
    const onNavigate = vi.fn();
    renderWithProvider(<HomePage onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Browse Courses'));
    expect(onNavigate).toHaveBeenCalledWith({ view: 'catalog' });
  });

  it('renders install prompt at the bottom when installable', () => {
    vi.mocked(getInstallState).mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      platform: 'desktop',
    });
    renderWithProvider(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getByText('Install App')).toBeInTheDocument();
  });

  it('hides install prompt when already installed', () => {
    vi.mocked(getInstallState).mockReturnValue({
      isInstallable: true,
      isInstalled: true,
      platform: 'desktop',
    });
    renderWithProvider(<HomePage onNavigate={vi.fn()} />);
    expect(screen.queryByText('Install App')).not.toBeInTheDocument();
  });
});
