import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressDashboard } from './ProgressDashboard';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => Promise.resolve({})),
}));

describe('ProgressDashboard', () => {
  it('shows empty state when no progress exists', () => {
    render(<ProgressDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText('Your learning journey starts here!')).toBeInTheDocument();
    expect(screen.getByText('Browse Courses')).toBeInTheDocument();
  });

  it('renders the heading', () => {
    render(<ProgressDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText('My Progress')).toBeInTheDocument();
  });
});
