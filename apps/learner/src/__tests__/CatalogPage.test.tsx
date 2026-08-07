import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CatalogPage } from '../CatalogPage';
import { proxyFetch } from '../oep-proxy/client';
import { installFromSource } from '../courseDownload';
import type * as OepProxyClient from '../oep-proxy/client';
import type * as CourseDownload from '../courseDownload';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => Promise.resolve({})),
  getProgress: vi.fn(() => Promise.resolve(null)),
  saveProgress: vi.fn(() => Promise.resolve()),
}));

vi.mock('../badgesStorage', () => ({
  addBadge: vi.fn(),
  getBadges: vi.fn(() => Promise.resolve([])),
  getAllBadges: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../oep-proxy/client', async (importOriginal) => {
  const actual = await importOriginal<typeof OepProxyClient>();
  return {
    ...actual,
    proxyFetch: vi.fn(),
  };
});

vi.mock('../courseDownload', async (importOriginal) => {
  const actual = await importOriginal<typeof CourseDownload>();
  return {
    ...actual,
    installFromSource: vi.fn().mockResolvedValue({
      success: true,
      courseId: 'remote-math',
      version: '1.2.0',
    }),
    getDownloadedCourses: vi.fn(() => Promise.resolve([])),
  };
});

const remoteCatalogData = {
  catalogVersion: 1 as const,
  generatedAt: '2026-01-01T00:00:00Z',
  packages: [
    {
      id: 'remote-math',
      title: 'Remote Math',
      description: 'A remote math course',
      author: 'Remote Author',
      tags: ['math'],
      latestVersion: '1.2.0',
      versions: [
        {
          version: '1.2.0',
          downloadUrl: 'https://example.org/remote-math-1.2.0.oep',
          checksum: 'a'.repeat(64),
          sizeBytes: 2048,
        },
      ],
    },
  ],
};

function mockProxyFetchForCatalog() {
  (proxyFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    json: () => Promise.resolve(remoteCatalogData),
  });
}

describe('CatalogPage', () => {
  beforeEach(() => {
    (proxyFetch as ReturnType<typeof vi.fn>).mockReset();
    (installFromSource as ReturnType<typeof vi.fn>).mockReset();
    (installFromSource as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      courseId: 'remote-math',
      version: '1.2.0',
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows install options when the local catalog is empty', () => {
    render(<CatalogPage packages={[]} onStartCourse={vi.fn()} />);

    expect(screen.getByTestId('open-install-dialog-button')).toBeInTheDocument();
    expect(screen.getByTestId('empty-install-button')).toBeInTheDocument();
    expect(screen.getByTestId('catalog-page')).toBeInTheDocument();
  });

  it('still shows install options alongside local courses', () => {
    render(
      <CatalogPage
        packages={[
          {
            manifest: {
              id: 'local-course',
              title: 'Local Course',
              version: '1.0.0',
              author: 'Local Author',
              entry: 'nodes/lesson-01.md',
            },
            nodeCount: 2,
            availableBadges: 0,
            rootDir: '/test/courses/local-course',
          },
        ]}
        onStartCourse={vi.fn()}
      />,
    );

    expect(screen.getByTestId('open-install-dialog-button')).toBeInTheDocument();
    expect(screen.getByText('Local Course')).toBeInTheDocument();
  });

  it('auto-adds remote catalog packages when VITE_CATALOG_URL is set', async () => {
    vi.stubEnv('VITE_CATALOG_URL', 'https://example.org/catalog.json');
    mockProxyFetchForCatalog();

    render(<CatalogPage packages={[]} onStartCourse={vi.fn()} />);

    expect(proxyFetch).toHaveBeenCalledWith('https://example.org/catalog.json');

    const card = await screen.findByTestId('course-card');
    expect(card).toBeInTheDocument();
    expect(screen.getByText('Remote Math')).toBeInTheDocument();
    expect(screen.getByText('by Remote Author')).toBeInTheDocument();
  });

  it('installs a remote package when its card is clicked', async () => {
    vi.stubEnv('VITE_CATALOG_URL', 'https://example.org/catalog.json');
    mockProxyFetchForCatalog();

    const onRefreshInstalled = vi.fn(() => Promise.resolve());
    render(
      <CatalogPage packages={[]} onStartCourse={vi.fn()} onRefreshInstalled={onRefreshInstalled} />,
    );

    const card = await screen.findByTestId('course-card');
    fireEvent.click(card);

    await waitFor(() => {
      expect(installFromSource).toHaveBeenCalledTimes(1);
    });

    const source = (installFromSource as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(source.label).toBe('Remote Math v1.2.0');
    expect(source.expectedChecksum).toBe('a'.repeat(64));

    await waitFor(() => {
      expect(onRefreshInstalled).toHaveBeenCalledTimes(1);
    });
  });

  it('does not list an installed course as a remote catalog entry', async () => {
    vi.stubEnv('VITE_CATALOG_URL', 'https://example.org/catalog.json');
    mockProxyFetchForCatalog();

    render(
      <CatalogPage
        packages={[
          {
            manifest: {
              id: 'remote-math',
              title: 'Remote Math',
              version: '1.2.0',
              author: 'Remote Author',
              entry: 'nodes/lesson-01.md',
            },
            nodeCount: 3,
            availableBadges: 0,
            rootDir: '/test/courses/remote-math',
          },
        ]}
        onStartCourse={vi.fn()}
      />,
    );

    expect(await screen.findByText('Remote Math')).toBeInTheDocument();
    expect(screen.getAllByTestId('course-card')).toHaveLength(1);
  });
});
