import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import axe from 'axe-core';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { AiStartPanel } from './AiStartPanel';
import { AiReviewView } from './AiReviewView';
import { AiAddDialog } from './AiAddDialog';
import { AiEditPanel } from './AiEditPanel';
import { ItemDraftPreview } from './ItemDraftPreview';
import type { StudioApi } from '../studioApi.js';
import type { AiGenerateResult } from '../ai/types.js';
import type { DraftItem } from '../ai/types.js';

vi.mock('../../editor/WidgetPreviewPanel.js', () => ({
  WidgetPreviewPanel: () => <div data-testid="widget-preview" />,
}));

vi.mock('../../editor/WidgetValidator.js', () => ({
  validateWidgetConfigForType: () => [],
}));

(globalThis as { axe?: typeof axe }).axe = axe;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {children}
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
    generateItemAdd: vi.fn().mockResolvedValue({
      ok: true,
      item: { kind: 'lesson', title: 'Fractions', content: '# Fractions\n\nBody' },
    }),
    generateItemEdit: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

const SUCCESS_RESULT: AiGenerateResult = {
  success: true,
  quality: [
    { id: 'objectives', labelKey: 'studio.ai.quality.objectives', passed: true },
    { id: 'assessment', labelKey: 'studio.ai.quality.assessment', passed: false },
  ],
  outlinePreview: [
    { title: 'Intro', kind: 'lesson' },
    { title: 'Check', kind: 'quiz' },
  ],
  title: 'AI Course',
};

async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });
  return results.violations;
}

describe('AI Studio components — axe-core accessibility audits', () => {
  it('AiStartPanel with AI available is accessible', async () => {
    const api = makeApi({ getAiStatus: vi.fn().mockResolvedValue({ available: true }) });
    const { container } = render(
      <AiStartPanel api={api} onGenerated={() => {}} onError={() => {}} />,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('AiStartPanel with AI unavailable is accessible', async () => {
    const { container } = render(
      <AiStartPanel api={makeApi()} onGenerated={() => {}} onError={() => {}} />,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('AiStartPanel upload spec tab is accessible', async () => {
    const { container } = render(
      <AiStartPanel api={makeApi()} onGenerated={() => {}} onError={() => {}} />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('tab', { name: /upload spec/i }));
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('AiReviewView with outline and quality checklist is accessible', async () => {
    const { container } = render(
      <AiReviewView result={SUCCESS_RESULT} onAccept={() => {}} onReject={() => {}} />,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('AiAddDialog with a generated draft preview is accessible', async () => {
    const user = userEvent.setup();
    const api = makeApi({ getAiStatus: vi.fn().mockResolvedValue({ available: true }) });
    const { container } = render(
      <AiAddDialog api={api} open onOpenChange={() => {}} onAccept={() => {}} onError={() => {}} />,
      { wrapper },
    );
    await user.type(
      await screen.findByLabelText(/describe what you want to create/i),
      'Explain fractions using pizza slice examples for beginners',
    );
    const generateButton = screen.getByRole('button', { name: /generate draft/i });
    await waitFor(() => expect(generateButton).toBeEnabled());
    await user.click(generateButton);
    expect(await screen.findByRole('heading', { name: 'Fractions' })).toBeInTheDocument();
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('ItemDraftPreview with a highlighted quiz draft is accessible', async () => {
    const item: DraftItem = {
      kind: 'quiz',
      title: 'Quiz',
      content: JSON.stringify({
        type: 'quiz',
        question: 'Q?',
        options: [
          { id: 'a', text: 'Alpha', correct: true },
          { id: 'b', text: 'Beta', correct: false },
        ],
      }),
    };
    const currentContent = JSON.stringify({
      type: 'quiz',
      question: 'Old Q?',
      options: [
        { id: 'a', text: 'Alpha', correct: true },
        { id: 'b', text: 'Different', correct: false },
      ],
    });
    const { container } = render(<ItemDraftPreview item={item} currentContent={currentContent} />, {
      wrapper,
    });
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('AiEditPanel with intent chips is accessible', async () => {
    const api = makeApi({
      getAiStatus: vi.fn().mockResolvedValue({ available: true }),
      generateItemEdit: vi.fn().mockResolvedValue({
        ok: true,
        items: [{ kind: 'lesson', title: 'L', content: '# L\n\nBody' }],
      }),
    });
    const { container } = render(
      <AiEditPanel
        api={api}
        kind="lesson"
        getCurrentContent={() => '# Current\n\nBody'}
        onApply={() => {}}
        onApplyBatch={() => {}}
        onError={() => {}}
      />,
      { wrapper },
    );
    expect(await screen.findByRole('button', { name: 'Rewrite' })).toBeInTheDocument();
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });
});
