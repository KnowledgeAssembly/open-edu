import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { AiEditPanel } from './AiEditPanel';
import type { StudioApi } from '../studioApi.js';
import type { DraftItem } from '../ai/types.js';

vi.mock('./ItemDraftPreview.js', () => ({
  ItemDraftPreview: () => <div data-testid="draft-preview" />,
}));

function wrap(ui: React.ReactElement, locale = 'en') {
  return (
    <I18nProvider
      locale={locale}
      dictionaries={{ en: { studio: studioEn as Record<string, string> } }}
    >
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
    getAiStatus: vi.fn().mockResolvedValue({ available: true }),
    generateItemEdit: vi.fn().mockResolvedValue({
      ok: true,
      items: [{ kind: 'lesson', title: 'Revised', content: '# Revised\n\nBody' }],
    }),
    ...overrides,
  } as unknown as StudioApi;
}

function defaultProps(overrides: Partial<Parameters<typeof AiEditPanel>[0]> = {}) {
  return {
    api: makeApi(),
    kind: 'lesson' as const,
    getCurrentContent: () => '# Current\n\nBody',
    onApply: vi.fn(),
    onApplyBatch: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

describe('AiEditPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters intent chips by kind', async () => {
    render(wrap(<AiEditPanel {...defaultProps()} />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rewrite' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Rewrite' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add questions' })).not.toBeInTheDocument();
  });

  it('shows add-questions for a quiz kind', async () => {
    render(wrap(<AiEditPanel {...defaultProps({ kind: 'quiz' })} />));
    expect(await screen.findByRole('button', { name: 'Add questions' })).toBeInTheDocument();
  });

  it('difficulty shows easier and harder sub-actions that send direction', async () => {
    const api = makeApi();
    const getCurrentContent = () => '# Current\n\nBody';
    render(
      wrap(
        <AiEditPanel
          {...defaultProps({ api, getCurrentContent, onApply: vi.fn(), onApplyBatch: vi.fn() })}
        />,
      ),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Easier' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Harder' }));
    await waitFor(() => expect(api.generateItemEdit).toHaveBeenCalled());
    expect(api.generateItemEdit).toHaveBeenCalledWith('lesson', 'difficulty', '# Current\n\nBody', {
      direction: 'harder',
    });
  });

  it('translate sends the provider locale', async () => {
    const api = makeApi();
    render(
      wrap(
        <AiEditPanel {...defaultProps({ api, onApply: vi.fn(), onApplyBatch: vi.fn() })} />,
        'es',
      ),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Translate' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Translate' }));
    await waitFor(() => expect(api.generateItemEdit).toHaveBeenCalled());
    expect(api.generateItemEdit).toHaveBeenCalledWith('lesson', 'translate', '# Current\n\nBody', {
      targetLocale: 'es',
    });
  });

  it('runs generateItemEdit with the current content and renders the preview', async () => {
    const api = makeApi();
    render(
      wrap(<AiEditPanel {...defaultProps({ api, onApply: vi.fn(), onApplyBatch: vi.fn() })} />),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rewrite' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Rewrite' }));
    await waitFor(() => expect(api.generateItemEdit).toHaveBeenCalled());
    expect(api.generateItemEdit).toHaveBeenCalledWith(
      'lesson',
      'rewrite',
      '# Current\n\nBody',
      undefined,
    );
    expect(await screen.findByTestId('draft-preview')).toBeInTheDocument();
  });

  it('accept applies the single item', async () => {
    const onApply = vi.fn();
    const api = makeApi();
    render(wrap(<AiEditPanel {...defaultProps({ api, onApply, onApplyBatch: vi.fn() })} />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rewrite' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Rewrite' }));
    await screen.findByTestId('draft-preview');
    await userEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(onApply).toHaveBeenCalledWith({
      kind: 'lesson',
      title: 'Revised',
      content: '# Revised\n\nBody',
    });
  });

  it('add-questions accept forwards the batch', async () => {
    const items: DraftItem[] = Array.from({ length: 3 }, (_, i) => ({
      kind: 'quiz' as const,
      title: `Q${i}`,
      content: '{}',
    }));
    const api = makeApi({
      generateItemEdit: vi.fn().mockResolvedValue({ ok: true, items }),
    });
    const onApplyBatch = vi.fn();
    render(wrap(<AiEditPanel {...defaultProps({ kind: 'quiz', api, onApplyBatch })} />));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add questions' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add questions' }));
    await screen.findByTestId('draft-preview');
    await userEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(onApplyBatch).toHaveBeenCalledWith(items);
  });

  it('reject clears the preview without applying', async () => {
    const onApply = vi.fn();
    const api = makeApi();
    render(wrap(<AiEditPanel {...defaultProps({ api, onApply, onApplyBatch: vi.fn() })} />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rewrite' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Rewrite' }));
    await screen.findByTestId('draft-preview');
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByTestId('draft-preview')).not.toBeInTheDocument();
  });

  it('shows the unavailable hint and disables intents when AI is unavailable', async () => {
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: false, reason: 'missing-key' }),
    });
    render(wrap(<AiEditPanel {...defaultProps({ api })} />));
    expect(
      await screen.findByText(/AI is unavailable offline or no API key is configured/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rewrite' })).not.toBeInTheDocument();
  });
});
