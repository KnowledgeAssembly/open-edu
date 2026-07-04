import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomePage } from './HomePage';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => ({})),
}));

vi.mock('../badgesStorage', () => ({
  getAllBadges: vi.fn(() => ({})),
}));

vi.mock('../bundleProgressStorage', () => ({
  getAllBundleProgress: vi.fn(() => ({})),
}));

describe('HomePage', () => {
  it('renders welcome heading', () => {
    render(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getByText('Welcome back, Learner')).toBeInTheDocument();
  });

  it('renders inline stats with default zero counts', () => {
    const { container } = render(<HomePage onNavigate={vi.fn()} />);
    const statsContainer = container.querySelector('.flex.items-center.gap-8');
    expect(statsContainer?.textContent).toMatch(/0.*courses/);
    expect(statsContainer?.textContent).toMatch(/0.*in progress/);
    expect(statsContainer?.textContent).toMatch(/0.*badges/);
  });

  it('renders quick link buttons', () => {
    render(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getByText('Browse Courses')).toBeInTheDocument();
    expect(screen.getByText('View Progress')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('calls onNavigate when Browse Courses is clicked', () => {
    const onNavigate = vi.fn();
    render(<HomePage onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Browse Courses'));
    expect(onNavigate).toHaveBeenCalledWith({ view: 'catalog' });
  });
});
