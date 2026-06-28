import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseExitWarningDialog } from './CourseExitWarningDialog';

describe('CourseExitWarningDialog', () => {
  it('renders when open', async () => {
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={vi.fn()} />);
    expect(await screen.findByTestId('exit-warning-dialog')).toBeInTheDocument();
    expect(await screen.findByText('Leave this course?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CourseExitWarningDialog open={false} onStay={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.queryByTestId('exit-warning-dialog')).not.toBeInTheDocument();
  });

  it('calls onStay when Stay button is clicked', async () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open onStay={onStay} onLeave={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('exit-warning-stay'));
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('calls onLeave when Leave button is clicked', async () => {
    const onLeave = vi.fn();
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={onLeave} />);
    fireEvent.click(await screen.findByTestId('exit-warning-leave'));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('calls onStay on Escape key', async () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open onStay={onStay} onLeave={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('does not call onStay on Escape key when closed', async () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open={false} onStay={onStay} onLeave={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onStay).not.toHaveBeenCalled();
  });

  it('has accessible dialog role and aria attributes', async () => {
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });
});
