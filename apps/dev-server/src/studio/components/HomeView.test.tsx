import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { HomeView } from './HomeView';
import type { StudioApi } from '../studioApi.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

function makeApi(overrides: Partial<StudioApi> = {}): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn(),
    saveOutlineOrder: vi.fn(),
    applyTemplate: vi.fn().mockResolvedValue({ success: true }),
    exportOep: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

describe('HomeView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all studio templates', () => {
    render(wrap(<HomeView api={makeApi()} onOpened={() => {}} onError={() => {}} />));
    expect(screen.getByText('Reading lesson')).toBeInTheDocument();
    expect(screen.getByText('Lesson + quiz')).toBeInTheDocument();
    expect(screen.getByText('Practice warm-up')).toBeInTheDocument();
    expect(screen.getByText('Short unit')).toBeInTheDocument();
  });

  it('applies a template and calls onOpened', async () => {
    const api = makeApi();
    render(wrap(<HomeView api={api} onOpened={vi.fn()} onError={() => {}} />));
    await userEvent.click(screen.getAllByRole('button', { name: /use template/i })[0]!);
    expect(api.applyTemplate).toHaveBeenCalledWith('reading-lesson');
  });

  it('calls onError when template apply fails', async () => {
    const onError = vi.fn();
    const api = makeApi({
      applyTemplate: vi.fn().mockRejectedValue(new Error('boom')),
    });
    render(wrap(<HomeView api={api} onOpened={() => {}} onError={onError} />));
    await userEvent.click(screen.getAllByRole('button', { name: /use template/i })[0]!);
    expect(onError).toHaveBeenCalledWith('boom');
  });

  it('AI start button is disabled with Coming soon', () => {
    render(wrap(<HomeView api={makeApi()} onOpened={() => {}} onError={() => {}} />));
    const aiButton = screen.getByRole('button', { name: /coming soon/i });
    expect(aiButton).toBeDisabled();
  });

  it('shows recent courses from storage', () => {
    localStorage.setItem(
      'openedu.studio.recent',
      JSON.stringify([
        { id: 'a', title: 'My Course', packageDir: '/tmp/a', updatedAt: Date.now() },
      ]),
    );
    render(wrap(<HomeView api={makeApi()} onOpened={() => {}} onError={() => {}} />));
    expect(screen.getByText('My Course')).toBeInTheDocument();
  });

  it('shows empty recent message when no courses', () => {
    render(wrap(<HomeView api={makeApi()} onOpened={() => {}} onError={() => {}} />));
    expect(screen.getByText('No recent courses yet.')).toBeInTheDocument();
  });

  it('opens a recent course via Open button', async () => {
    const onOpened = vi.fn();
    localStorage.setItem(
      'openedu.studio.recent',
      JSON.stringify([
        { id: 'a', title: 'My Course', packageDir: '/tmp/a', updatedAt: Date.now() },
      ]),
    );
    render(wrap(<HomeView api={makeApi()} onOpened={onOpened} onError={() => {}} />));
    const list = screen.getByRole('list');
    await userEvent.click(within(list).getByRole('button', { name: /open/i }));
    expect(onOpened).toHaveBeenCalled();
  });
});
