import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallPrompt } from '../components/InstallPrompt.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('InstallPrompt', () => {
  it('renders install button when installable and not installed', () => {
    renderWithProvider(<InstallPrompt isInstallable={true} isInstalled={false} onInstall={vi.fn()} />);
    expect(screen.getByText('Install App')).toBeInTheDocument();
  });

  it('renders nothing when already installed', () => {
    const { container } = renderWithProvider(
      <InstallPrompt isInstallable={true} isInstalled={true} onInstall={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when not installable', () => {
    const { container } = renderWithProvider(
      <InstallPrompt isInstallable={false} isInstalled={false} onInstall={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onInstall when button clicked', () => {
    const onInstall = vi.fn();
    renderWithProvider(<InstallPrompt isInstallable={true} isInstalled={false} onInstall={onInstall} />);
    fireEvent.click(screen.getByText('Install App'));
    expect(onInstall).toHaveBeenCalledOnce();
  });

  it('has accessible role and aria-label', () => {
    renderWithProvider(<InstallPrompt isInstallable={true} isInstalled={false} onInstall={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install openedu app/i })).toBeInTheDocument();
  });
});
