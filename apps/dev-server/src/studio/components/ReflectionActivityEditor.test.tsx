import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { ReflectionActivityEditor } from './ReflectionActivityEditor';
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
    readFile: vi.fn().mockResolvedValue({
      path: 'nodes/r.json',
      content: '{"type":"reflection","title":"Reflect","prompt":"What did you notice?"}',
    }),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
    getAiStatus: vi.fn().mockResolvedValue({ available: false }),
    generateItemEdit: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

describe('ReflectionActivityEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads title and prompt from the reflection node', async () => {
    render(
      wrap(
        <ReflectionActivityEditor
          api={makeApi()}
          path="nodes/r.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByDisplayValue('Reflect')).toBeInTheDocument();
    expect(screen.getByLabelText(/reflection prompt/i)).toHaveValue('What did you notice?');
  });

  it('saves type, title and prompt via writeFile', async () => {
    const api = makeApi();
    render(
      wrap(
        <ReflectionActivityEditor
          api={api}
          path="nodes/r.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    await screen.findByDisplayValue('Reflect');
    const prompt = screen.getByLabelText(/reflection prompt/i);
    await userEvent.clear(prompt);
    await userEvent.type(prompt, 'How does line affect rhythm?');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    expect(writeCall).toHaveBeenCalledWith(
      'nodes/r.json',
      '{\n  "type": "reflection",\n  "title": "Reflect",\n  "prompt": "How does line affect rhythm?"\n}',
    );
  });

  it('shows a coaching check when the prompt is missing', async () => {
    const api = makeApi({
      readFile: vi
        .fn()
        .mockResolvedValue({ path: 'nodes/r.json', content: '{"type":"reflection"}' }),
    });
    render(
      wrap(
        <ReflectionActivityEditor
          api={api}
          path="nodes/r.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByText('Write a reflection prompt')).toBeInTheDocument();
  });

  it('shows a passing coaching check once a prompt is typed', async () => {
    const api = makeApi({
      readFile: vi
        .fn()
        .mockResolvedValue({ path: 'nodes/r.json', content: '{"type":"reflection"}' }),
    });
    render(
      wrap(
        <ReflectionActivityEditor
          api={api}
          path="nodes/r.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    const prompt = await screen.findByLabelText(/reflection prompt/i);
    await userEvent.type(prompt, 'What did you notice?');
    expect(await screen.findByText('Has a reflection prompt')).toBeInTheDocument();
  });
});
