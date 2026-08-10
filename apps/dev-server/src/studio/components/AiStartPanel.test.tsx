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
    uploadSpec: vi.fn(),
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

  it('translates known API error codes instead of leaking server strings', async () => {
    const onError = vi.fn();
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      generateFromNotes: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('No active package'), { code: 'no-active-package' }),
        ),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={onError} />));
    const textarea = await screen.findByLabelText(/your notes/i);
    await userEvent.type(textarea, 'A short topic for a course');
    await userEvent.click(screen.getByRole('button', { name: /generate draft/i }));
    await vi.waitFor(() =>
      expect(onError).toHaveBeenCalledWith('No course is open. Open or create a course first.'),
    );
  });

  it('asks for overwrite confirmation when the course already has content', async () => {
    const result: AiGenerateResult = {
      success: true,
      quality: [],
      outlinePreview: [{ title: 'Intro', kind: 'lesson' }],
      title: 'X',
    };
    const generate = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        code: 'has-content',
        quality: [],
        outlinePreview: [],
        error: 'Package already has content',
      })
      .mockResolvedValueOnce(result);
    const onGenerated = vi.fn();
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      generateFromNotes: generate,
    });
    render(wrap(<AiStartPanel api={api} onGenerated={onGenerated} onError={() => {}} />));
    const textarea = await screen.findByLabelText(/your notes/i);
    await userEvent.type(textarea, 'A short topic for a course');
    await userEvent.click(screen.getByRole('button', { name: /generate draft/i }));
    expect(
      await screen.findByText(
        'This course already has content. Generating a new draft replaces it, and this cannot be undone from Studio.',
      ),
    ).toBeInTheDocument();
    expect(generate).toHaveBeenLastCalledWith('A short topic for a course', false);
    await userEvent.click(screen.getByRole('button', { name: /replace content/i }));
    await vi.waitFor(() => expect(onGenerated).toHaveBeenCalledWith(result));
    expect(generate).toHaveBeenLastCalledWith('A short topic for a course', true);
  });

  it('does not force-overwrite when the user cancels the confirmation', async () => {
    const generate = vi.fn().mockResolvedValue({
      success: false,
      code: 'has-content',
      quality: [],
      outlinePreview: [],
      error: 'Package already has content',
    });
    const onGenerated = vi.fn();
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      generateFromNotes: generate,
    });
    render(wrap(<AiStartPanel api={api} onGenerated={onGenerated} onError={() => {}} />));
    const textarea = await screen.findByLabelText(/your notes/i);
    await userEvent.type(textarea, 'A short topic for a course');
    await userEvent.click(screen.getByRole('button', { name: /generate draft/i }));
    await userEvent.click(await screen.findByRole('button', { name: /cancel/i }));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('keeps the generate button disabled until notes are typed', async () => {
    const api = makeApi({ getAiStatus: vi.fn().mockResolvedValue({ available: true }) });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />));
    const button = await screen.findByRole('button', { name: /generate draft/i });
    expect(button).toBeDisabled();
    await userEvent.type(await screen.findByLabelText(/your notes/i), 'Some notes');
    expect(button).toBeEnabled();
  });

  async function openUploadTab() {
    await userEvent.click(screen.getByRole('tab', { name: /upload spec/i }));
  }

  async function selectFile(name: string, content: string, type = '') {
    const input = screen.getByLabelText(/choose file/i);
    const file = new File([content], name, type ? { type } : undefined) as File & {
      text: () => Promise<string>;
    };
    file.text = async () => content;
    await userEvent.upload(input, file, { applyAccept: false });
  }

  it('shows the upload tab and lets a file be selected even when AI is unavailable', async () => {
    const api = makeApi({ getAiStatus: vi.fn().mockResolvedValue({ available: false }) });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />));
    await openUploadTab();

    expect(screen.getByLabelText(/choose file/i)).toBeInTheDocument();
    const uploadButton = screen.getByRole('button', { name: /upload spec/i });
    expect(uploadButton).toBeDisabled();

    await selectFile('course-spec.json', '{"format":"openedu-course-spec"}');
    await vi.waitFor(() => expect(uploadButton).toBeEnabled());
    expect(api.uploadSpec).not.toHaveBeenCalled();
  });

  it('uploads a .json spec and routes the result to onGenerated', async () => {
    const result: AiGenerateResult = {
      success: true,
      quality: [],
      outlinePreview: [{ title: 'Intro', kind: 'lesson' }],
      title: 'X',
    };
    const onGenerated = vi.fn();
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      uploadSpec: vi.fn().mockResolvedValue(result),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={onGenerated} onError={() => {}} />));
    await openUploadTab();
    await selectFile('course-spec.json', '{"format":"openedu-course-spec"}', 'application/json');
    const uploadButton = screen.getByRole('button', { name: /upload spec/i });
    await vi.waitFor(() => expect(uploadButton).toBeEnabled());
    await userEvent.click(uploadButton);
    await vi.waitFor(() => expect(onGenerated).toHaveBeenCalledWith(result));
    expect(api.uploadSpec).toHaveBeenCalledWith('{"format":"openedu-course-spec"}', '.json', false);
  });

  it('sends .md specs with the markdown extension', async () => {
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      uploadSpec: vi.fn().mockResolvedValue({
        success: true,
        quality: [],
        outlinePreview: [],
        title: 'X',
      }),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />));
    await openUploadTab();
    await selectFile('course-spec.md', '# My Course\n\nContent', 'text/markdown');
    const uploadButton = screen.getByRole('button', { name: /upload spec/i });
    await vi.waitFor(() => expect(uploadButton).toBeEnabled());
    await userEvent.click(uploadButton);
    await vi.waitFor(() => expect(api.uploadSpec).toHaveBeenCalled());
    expect(api.uploadSpec).toHaveBeenCalledWith('# My Course\n\nContent', '.md', false);
  });

  it('shows specInvalid and never calls the API for an unsupported extension', async () => {
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      uploadSpec: vi.fn().mockResolvedValue({
        success: true,
        quality: [],
        outlinePreview: [],
        title: 'X',
      }),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />));
    await openUploadTab();
    await selectFile('course-spec.yaml', 'notes: []');
    expect(
      await screen.findByText(
        'Not a valid course spec. Use a .json or .md file that follows the openedu-course-spec format.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload spec/i })).toBeDisabled();
    expect(api.uploadSpec).not.toHaveBeenCalled();
  });

  it('asks for overwrite confirmation on has-content and force-uploads on confirm', async () => {
    const result: AiGenerateResult = {
      success: true,
      quality: [],
      outlinePreview: [{ title: 'Intro', kind: 'lesson' }],
      title: 'X',
    };
    const upload = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        code: 'has-content',
        quality: [],
        outlinePreview: [],
        error: 'Package already has content',
      })
      .mockResolvedValueOnce(result);
    const onGenerated = vi.fn();
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      uploadSpec: upload,
    });
    render(wrap(<AiStartPanel api={api} onGenerated={onGenerated} onError={() => {}} />));
    await openUploadTab();
    await selectFile('course-spec.json', '{"format":"openedu-course-spec"}', 'application/json');
    const uploadButton = screen.getByRole('button', { name: /upload spec/i });
    await vi.waitFor(() => expect(uploadButton).toBeEnabled());
    await userEvent.click(uploadButton);
    expect(
      await screen.findByText(
        'This course already has content. Generating a new draft replaces it, and this cannot be undone from Studio.',
      ),
    ).toBeInTheDocument();
    expect(upload).toHaveBeenLastCalledWith('{"format":"openedu-course-spec"}', '.json', false);
    await userEvent.click(screen.getByRole('button', { name: /replace content/i }));
    await vi.waitFor(() => expect(onGenerated).toHaveBeenCalledWith(result));
    expect(upload).toHaveBeenLastCalledWith('{"format":"openedu-course-spec"}', '.json', true);
  });

  it('shows the server compile error inline on upload failure', async () => {
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      uploadSpec: vi.fn().mockResolvedValue({
        success: false,
        code: 'compile',
        quality: [],
        outlinePreview: [],
        error: 'missing title',
      }),
    });
    render(wrap(<AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />));
    await openUploadTab();
    await selectFile('course-spec.json', '{ "bad": true }', 'application/json');
    const uploadButton = screen.getByRole('button', { name: /upload spec/i });
    await vi.waitFor(() => expect(uploadButton).toBeEnabled());
    await userEvent.click(uploadButton);
    expect(await screen.findByText('missing title')).toBeInTheDocument();
  });
});
