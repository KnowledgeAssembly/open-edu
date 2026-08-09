import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import axe from 'axe-core';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { AiStartPanel } from './AiStartPanel';
import { AiReviewView } from './AiReviewView';
import type { StudioApi } from '../studioApi.js';
import type { AiGenerateResult } from '../ai/types.js';

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
});
