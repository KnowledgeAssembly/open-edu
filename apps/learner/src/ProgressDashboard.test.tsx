import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressDashboard } from './ProgressDashboard';
import { I18nProvider } from '@open-edu/i18n';
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

describe('ProgressDashboard', () => {
  it('shows empty state when no progress exists', () => {
    renderWithProvider(<ProgressDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText('Your learning journey starts here!')).toBeInTheDocument();
    expect(screen.getByText('Browse Courses')).toBeInTheDocument();
  });

  it('renders the heading', () => {
    renderWithProvider(<ProgressDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText('My Progress')).toBeInTheDocument();
  });
});
