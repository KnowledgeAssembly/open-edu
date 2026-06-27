import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseExitWarningDialog } from './CourseExitWarningDialog';

describe('CourseExitWarningDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders when open', () => {
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.getByTestId('exit-warning-dialog')).toBeInTheDocument();
    expect(screen.getByText('Leave this course?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CourseExitWarningDialog open={false} onStay={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.queryByTestId('exit-warning-dialog')).not.toBeInTheDocument();
  });

  it('calls onStay when Stay button is clicked', () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open onStay={onStay} onLeave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('exit-warning-stay'));
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('calls onLeave when Leave button is clicked', () => {
    const onLeave = vi.fn();
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={onLeave} />);
    fireEvent.click(screen.getByTestId('exit-warning-leave'));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('calls onStay on Escape key', () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open onStay={onStay} onLeave={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('does not call onStay on Escape key when closed', () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open={false} onStay={onStay} onLeave={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onStay).not.toHaveBeenCalled();
  });

  it('has accessible dialog role and aria attributes', () => {
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'exit-warning-title');
  });
});
