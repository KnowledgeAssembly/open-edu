import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomePage } from './HomePage';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => ({})),
}));

describe('HomePage', () => {
  it('renders welcome heading', () => {
    render(<HomePage onNavigate={vi.fn()} />);
    expect(screen.getByText('Welcome to OpenEdu')).toBeInTheDocument();
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
