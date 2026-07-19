import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DownloadButton } from '../components/DownloadButton.js';

describe('DownloadButton', () => {
  it('renders download button for non-downloaded course', () => {
    render(<DownloadButton courseId="test-course" isDownloaded={false} />);
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('renders remove button for downloaded course', () => {
    render(<DownloadButton courseId="test-course" isDownloaded={true} />);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('calls onDownload when clicked and course is not downloaded', async () => {
    const onDownload = vi.fn();
    const user = userEvent.setup();
    render(<DownloadButton courseId="test" isDownloaded={false} onDownload={onDownload} />);

    await user.click(screen.getByRole('button'));
    expect(onDownload).toHaveBeenCalledWith('test');
  });

  it('calls onDelete when clicked and course is downloaded', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<DownloadButton courseId="test" isDownloaded={true} onDelete={onDelete} />);

    await user.click(screen.getByRole('button'));
    expect(onDelete).toHaveBeenCalledWith('test');
  });
});
