import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftNav } from './LeftNav';

describe('LeftNav', () => {
  it('renders Section 1 navigation items', () => {
    render(<LeftNav currentView={{ view: 'home' }} onNavigate={vi.fn()} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My Progress')).toBeInTheDocument();
    expect(screen.getByText('Course Catalog')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('marks the active view with aria-current="page"', () => {
    const { rerender } = render(<LeftNav currentView={{ view: 'home' }} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('leftnav-home')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('leftnav-catalog')).not.toHaveAttribute('aria-current');

    rerender(<LeftNav currentView={{ view: 'catalog' }} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('leftnav-catalog')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('leftnav-home')).not.toHaveAttribute('aria-current');
  });

  it('calls onNavigate when a nav item is clicked', () => {
    const onNavigate = vi.fn();
    render(<LeftNav currentView={{ view: 'home' }} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Course Catalog'));
    expect(onNavigate).toHaveBeenCalledWith({ view: 'catalog' });
  });

  it('does not render Section 2 when not in course view', () => {
    render(<LeftNav currentView={{ view: 'home' }} onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('course-step-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leftnav-back-to-catalog')).not.toBeInTheDocument();
  });

  it('does not render Section 2 when in course view outside RuntimeProvider', () => {
    render(<LeftNav currentView={{ view: 'course', packageId: 'test' }} onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('course-step-list')).not.toBeInTheDocument();
  });
});
