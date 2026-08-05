import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { AiStartPanel } from './AiStartPanel';
import type { StudioApi } from '../studioApi.js';
import type { AiGenerateResult } from '../ai/types.js';

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
    readFile: vi.fn(),
    writeFile: vi.fn(),
    getAiStatus: vi.fn().mockResolvedValue({ available: false }),
    generateFromNotes: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

describe('AiStartPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the unavailable message and no generate button when AI is offline', async () => {
    render(wrap(<AiStartPanel api={makeApi()} onGenerated={() => {}} onError={() => {}} />));
    expect(
      await screen.findByText(
        'AI is unavailable offline or no API key is configured. Use a template instead.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate draft/i })).not.toBeInTheDocument();
  });

  it('shows the notes textarea and generate button when AI is available', async () => {
    const api = makeApi({ getAiStatus: vi.fn().mockResolvedValue({ available: true }) });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />));
    expect(await screen.findByLabelText(/your notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate draft/i })).toBeInTheDocument();
  });

  it('calls onGenerated with the result after generating', async () => {
    const result: AiGenerateResult = {
      success: true,
      quality: [],
      outlinePreview: [{ title: 'Intro', kind: 'lesson' }],
      title: 'X',
    };
    const onGenerated = vi.fn();
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      generateFromNotes: vi.fn().mockResolvedValue(result),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={onGenerated} onError={() => {}} />));
    const textarea = await screen.findByLabelText(/your notes/i);
    await userEvent.type(textarea, 'A short topic for a course');
    await userEvent.click(screen.getByRole('button', { name: /generate draft/i }));
    await vi.waitFor(() => expect(onGenerated).toHaveBeenCalledWith(result));
  });

  it('shows the too-short message and does not call onGenerated on failure', async () => {
    const onGenerated = vi.fn();
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      generateFromNotes: vi.fn().mockResolvedValue({
        success: false,
        code: 'notes-too-short',
        quality: [],
        outlinePreview: [],
        error: 'Add more detail',
      }),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={onGenerated} onError={() => {}} />));
    const textarea = await screen.findByLabelText(/your notes/i);
    await userEvent.type(textarea, 'A short topic for a course');
    await userEvent.click(screen.getByRole('button', { name: /generate draft/i }));
    expect(
      await screen.findByText(
        'Add a bit more detail — a sentence or two about what students should learn.',
      ),
    ).toBeInTheDocument();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('shows the generic error message for non-too-short failures', async () => {
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      generateFromNotes: vi.fn().mockResolvedValue({
        success: false,
        quality: [],
        outlinePreview: [],
        error: 'Could not parse the draft',
      }),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />));
    const textarea = await screen.findByLabelText(/your notes/i);
    await userEvent.type(textarea, 'A short topic for a course');
    await userEvent.click(screen.getByRole('button', { name: /generate draft/i }));
    expect(
      await screen.findByText('Could not generate a draft. Try again or use a template.'),
    ).toBeInTheDocument();
  });

  it('calls onError when the API throws', async () => {
    const onError = vi.fn();
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      generateFromNotes: vi.fn().mockRejectedValue(new Error('network down')),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={onError} />));
    const textarea = await screen.findByLabelText(/your notes/i);
    await userEvent.type(textarea, 'A short topic for a course');
    await userEvent.click(screen.getByRole('button', { name: /generate draft/i }));
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('network down'));
  });

  it('keeps the generate button disabled until notes are typed', async () => {
    const api = makeApi({ getAiStatus: vi.fn().mockResolvedValue({ available: true }) });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />));
    const button = await screen.findByRole('button', { name: /generate draft/i });
    expect(button).toBeDisabled();
    await userEvent.type(await screen.findByLabelText(/your notes/i), 'Some notes');
    expect(button).toBeEnabled();
  });
});
