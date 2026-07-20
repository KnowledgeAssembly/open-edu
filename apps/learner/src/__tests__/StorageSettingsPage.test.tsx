import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StorageSettingsPage } from '../pages/StorageSettingsPage';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

vi.mock('../hooks/useStorageUsage.js', () => ({
  useStorageUsage: () => ({ usage: 1024 * 1024, quota: 1024 * 1024 * 100, percentage: 1 }),
}));

vi.mock('../courseDownload.js', () => ({
  getDownloadedCourses: vi.fn().mockResolvedValue([]),
  deleteDownloadedCourse: vi.fn().mockResolvedValue(undefined),
}));

describe('StorageSettingsPage', () => {
  it('renders storage usage and downloaded courses', async () => {
    renderWithProvider(<StorageSettingsPage />);
    expect(screen.getByText('Storage Settings')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/No downloaded courses yet/)).toBeInTheDocument();
    });
  });
});
