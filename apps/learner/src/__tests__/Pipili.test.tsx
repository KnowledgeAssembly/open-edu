import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pipili } from '../components/Pipili';

describe('Pipili (learner wrapper)', () => {
  it('renders when visible is true', () => {
    render(<Pipili visible />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('returns null when visible is false', () => {
    render(<Pipili visible={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('has role status by default', () => {
    render(<Pipili visible />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has role button when onClick is provided', () => {
    render(<Pipili visible onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has correct aria-label for idle mood', () => {
    render(<Pipili visible mood="idle" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Pipili is here');
  });

  it('has correct aria-label for curious mood', () => {
    render(<Pipili visible mood="curious" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Pipili is curious');
  });

  it('is focusable when onClick is provided', () => {
    render(<Pipili visible onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Pipili visible onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter key', () => {
    const onClick = vi.fn();
    render(<Pipili visible onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Space key', () => {
    const onClick = vi.fn();
    render(<Pipili visible onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('accepts custom className', () => {
    render(<Pipili visible className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });

  it('renders Pipili primitive inside', () => {
    render(<Pipili visible mood="content" />);
    const status = screen.getByRole('status');
    expect(status.querySelector('[role="img"]')).toHaveAttribute('aria-label', 'Pipili — content');
  });

  it('shows unread dot indicator when hasUnread is true', () => {
    render(<Pipili visible hasUnread />);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('does not show unread dot when hasUnread is false', () => {
    render(<Pipili visible hasUnread={false} />);
    expect(screen.queryByText('!')).not.toBeInTheDocument();
  });
});
