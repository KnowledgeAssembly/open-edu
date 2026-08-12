import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { RawActivityEditor } from './RawActivityEditor';
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
    applyTemplate: vi.fn(),
    exportOep: vi.fn(),
    readFile: vi.fn().mockResolvedValue({ path: 'nodes/notes.txt', content: 'hello world' }),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
    getAiStatus: vi.fn().mockResolvedValue({ available: false }),
    generateItemEdit: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

describe('RawActivityEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the filename and loads raw content', async () => {
    render(
      wrap(
        <RawActivityEditor
          api={makeApi()}
          path="nodes/notes.txt"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByText('notes.txt')).toBeInTheDocument();
    expect(screen.getByLabelText(/file content/i)).toHaveValue('hello world');
  });

  it('saves edited content via writeFile', async () => {
    const api = makeApi();
    render(
      wrap(
        <RawActivityEditor
          api={api}
          path="nodes/notes.txt"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    const textarea = await screen.findByLabelText(/file content/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'updated content');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    expect(writeCall).toHaveBeenCalledWith('nodes/notes.txt', 'updated content');
  });

  it('blocks saving and warns when content looks like invalid JSON', async () => {
    const api = makeApi({
      readFile: vi.fn().mockResolvedValue({ path: 'nodes/r.json', content: '{"type":"quiz"' }),
    });
    render(
      wrap(
        <RawActivityEditor api={api} path="nodes/r.json" onSaved={() => {}} onError={() => {}} />,
      ),
    );
    expect(await screen.findByText(/isn.t valid yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('allows saving valid JSON', async () => {
    const api = makeApi({
      readFile: vi
        .fn()
        .mockResolvedValue({ path: 'nodes/r.json', content: '{"type":"reflection"}' }),
    });
    render(
      wrap(
        <RawActivityEditor api={api} path="nodes/r.json" onSaved={() => {}} onError={() => {}} />,
      ),
    );
    await screen.findByLabelText(/file content/i);
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });
});
