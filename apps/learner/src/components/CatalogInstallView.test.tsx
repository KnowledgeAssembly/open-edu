import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CatalogInstallView } from './CatalogInstallView';
import type { Catalog, InstallResult } from '@open-edu/oep-distribution';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

const {
  parseCatalogMock,
  catalogSourceMock,
  installFromSourceMock,
  proxyFetchMock,
  proxyUrlMock,
  toastMock,
} = vi.hoisted(() => ({
  parseCatalogMock: vi.fn(),
  catalogSourceMock: vi.fn((source: unknown) => source),
  installFromSourceMock: vi.fn(),
  proxyFetchMock: vi.fn(),
  proxyUrlMock: vi.fn((url: string) => url),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@open-edu/oep-distribution', () => ({
  parseCatalog: parseCatalogMock,
  catalogSource: catalogSourceMock,
}));

vi.mock('../courseDownload', () => ({
  installFromSource: installFromSourceMock,
}));

vi.mock('../oep-proxy/client', () => ({
  proxyFetch: proxyFetchMock,
  proxyUrl: proxyUrlMock,
  proxyErrorCode: () => undefined,
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

const fixtureCatalog: Catalog = {
  catalogVersion: 1,
  packages: [
    {
      id: 'cat-course-1',
      title: 'Catalog Course One',
      latestVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          sizeBytes: 1024,
          checksum: 'a'.repeat(64),
          downloadUrl: 'https://example.org/course-1.oep',
          languages: ['en'],
        },
      ],
    },
  ],
};

const successResult: InstallResult = {
  success: true,
  courseId: 'cat-course-1',
  version: '1.0.0',
};

const failureResult: InstallResult = {
  success: false,
  courseId: 'cat-course-1',
  version: '1.0.0',
  errorCode: 'CHECKSUM_MISMATCH',
};

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('CatalogInstallView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proxyUrlMock.mockImplementation((url: string) => url);
    catalogSourceMock.mockImplementation((source: unknown) => source);
  });

  it('shows a success toast and marks the course installed after a successful install', async () => {
    installFromSourceMock.mockResolvedValue(successResult);
    const onInstalled = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(<CatalogInstallView onInstalled={onInstalled} />);
    proxyFetchMock.mockResolvedValue({ json: async () => fixtureCatalog });
    parseCatalogMock.mockReturnValue(fixtureCatalog);
    fireEvent.change(screen.getByLabelText('Catalog URL'), {
      target: { value: 'https://example.org/catalog.json' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Catalog' }));
    await waitFor(() => {
      expect(screen.getByText('Catalog Course One')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('install-from-catalog-button'));

    await waitFor(() => {
      expect(installFromSourceMock).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Catalog Course One v1.0.0' }),
      );
      expect(toastMock.success).toHaveBeenCalledWith('Course installed successfully');
      expect(onInstalled).toHaveBeenCalled();
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });
    expect(screen.getByTestId('install-from-catalog-button')).toBeDisabled();
  });

  it('shows an error toast when the install fails', async () => {
    installFromSourceMock.mockResolvedValue(failureResult);
    const onInstalled = vi.fn();
    renderWithI18n(<CatalogInstallView onInstalled={onInstalled} />);
    proxyFetchMock.mockResolvedValue({ json: async () => fixtureCatalog });
    parseCatalogMock.mockReturnValue(fixtureCatalog);
    fireEvent.change(screen.getByLabelText('Catalog URL'), {
      target: { value: 'https://example.org/catalog.json' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Catalog' }));
    await waitFor(() => {
      expect(screen.getByText('Catalog Course One')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('install-from-catalog-button'));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Checksum verification failed');
    });
    expect(onInstalled).not.toHaveBeenCalled();
  });

  it('does not invoke onInstalled when the fetch catalog fails', async () => {
    const onInstalled = vi.fn();
    renderWithI18n(<CatalogInstallView onInstalled={onInstalled} />);
    proxyFetchMock.mockRejectedValue(new Error('network'));
    fireEvent.change(screen.getByLabelText('Catalog URL'), {
      target: { value: 'https://example.org/catalog.json' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Catalog' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load catalog');
    });
    expect(onInstalled).not.toHaveBeenCalled();
  });
});
