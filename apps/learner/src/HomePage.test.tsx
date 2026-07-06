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

  it('renders summary stats with default zero counts', () => {
    render(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getAllByText('0')).toHaveLength(3);
    expect(screen.getByText('courses')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    expect(screen.getByText('badges')).toBeInTheDocument();
  });

  it('renders Begin Learning button', () => {
    render(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getByText('Begin Learning')).toBeInTheDocument();
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
