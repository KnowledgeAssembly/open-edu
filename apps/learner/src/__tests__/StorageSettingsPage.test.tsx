import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StorageSettingsPage } from '../pages/StorageSettingsPage';

vi.mock('../hooks/useStorageUsage.js', () => ({
  useStorageUsage: () => ({ usage: 1024 * 1024, quota: 1024 * 1024 * 100, percentage: 1 }),
}));

vi.mock('../courseDownload.js', () => ({
  getDownloadedCourses: vi.fn().mockResolvedValue([]),
  deleteDownloadedCourse: vi.fn().mockResolvedValue(undefined),
}));

describe('StorageSettingsPage', () => {
  it('renders storage usage and downloaded courses', async () => {
    render(<StorageSettingsPage />);
    expect(screen.getByText('Storage Settings')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/No downloaded courses yet/)).toBeInTheDocument();
    });
  });
});
