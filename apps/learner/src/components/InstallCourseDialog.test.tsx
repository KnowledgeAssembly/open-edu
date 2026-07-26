import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstallCourseDialog } from './InstallCourseDialog';
import { I18nProvider } from '@open-edu/i18n';

const mockT = (key: string) => key;
vi.mock('@open-edu/i18n', () => ({
  useTranslation: () => ({ t: mockT }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('InstallCourseDialog', () => {
  it('renders dialog when open', () => {
    render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog open={true} onClose={vi.fn()} onInstall={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('oep-file-input')).toBeDefined();
    expect(screen.getByTestId('install-file-button')).toBeDefined();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog open={false} onClose={vi.fn()} onInstall={vi.fn()} />
      </I18nProvider>,
    );
    expect(container.querySelector('[data-testid="oep-file-input"]')).toBeNull();
  });
});
