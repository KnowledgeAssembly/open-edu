import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallCourseDialog } from './InstallCourseDialog';
import { I18nProvider } from '@open-edu/i18n';

const mockT = (key: string) => key;
vi.mock('@open-edu/i18n', () => ({
  useTranslation: () => ({ t: mockT }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { urlSourceMock, proxyUrlMock, toastMock } = vi.hoisted(() => ({
  urlSourceMock: vi.fn((source: unknown) => source),
  proxyUrlMock: vi.fn((url: string) => url),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@open-edu/oep-distribution', () => ({
  fileSource: (file: unknown) => file,
  urlSource: urlSourceMock,
}));

vi.mock('../oep-proxy/client', () => ({
  proxyUrl: proxyUrlMock,
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

describe('InstallCourseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proxyUrlMock.mockImplementation((url: string) => url);
  });

  it('renders dialog when open', () => {
    render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog open={true} onClose={vi.fn()} onInstall={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('oep-file-input')).toBeDefined();
    expect(screen.getByTestId('install-file-button')).toBeDefined();
  });

  it('renders the browse button with hover feedback classes', () => {
    render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog open={true} onClose={vi.fn()} onInstall={vi.fn()} />
      </I18nProvider>,
    );
    const input = screen.getByTestId('oep-file-input');
    expect(input.className).toContain('file:hover:bg-surface-container-highest');
    expect(input.className).toContain('file:transition-colors');
  });

  it('does not render when closed', () => {
    const { container } = render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog open={false} onClose={vi.fn()} onInstall={vi.fn()} />
      </I18nProvider>,
    );
    expect(container.querySelector('[data-testid="oep-file-input"]')).toBeNull();
  });

  it('shows a success toast and closes when URL install succeeds', async () => {
    const user = userEvent.setup();
    const onInstall = vi.fn().mockResolvedValue({ success: true, courseId: 'x', version: '1.0.0' });
    const onClose = vi.fn();
    render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog open={true} onClose={onClose} onInstall={onInstall} />
      </I18nProvider>,
    );

    await user.click(screen.getByText('learner.install.from_url'));
    fireEvent.change(screen.getByTestId('oep-url-input'), {
      target: { value: 'https://example.org/course.oep' },
    });
    fireEvent.click(screen.getByTestId('install-url-button'));

    await waitFor(() => {
      expect(onInstall).toHaveBeenCalled();
    });
    expect(proxyUrlMock).toHaveBeenCalledWith('https://example.org/course.oep');
    expect(toastMock.success).toHaveBeenCalledWith('learner.install.success');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an inline error and does not close when URL install fails', async () => {
    const user = userEvent.setup();
    const onInstall = vi.fn().mockResolvedValue({
      success: false,
      courseId: 'x',
      version: '1.0.0',
      errorCode: 'CHECKSUM_MISMATCH',
    });
    const onClose = vi.fn();
    render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog open={true} onClose={onClose} onInstall={onInstall} />
      </I18nProvider>,
    );

    await user.click(screen.getByText('learner.install.from_url'));
    fireEvent.change(screen.getByTestId('oep-url-input'), {
      target: { value: 'https://example.org/course.oep' },
    });
    fireEvent.click(screen.getByTestId('install-url-button'));

    await waitFor(() => {
      expect(screen.getByTestId('install-error')).toHaveTextContent(
        'learner.install.error_checksum_mismatch',
      );
    });
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
