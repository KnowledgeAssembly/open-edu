import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { AiReviewView } from './AiReviewView';
import type { AiGenerateResult } from '../ai/types.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const SUCCESS_RESULT: AiGenerateResult = {
  success: true,
  quality: [
    { id: 'objectives', labelKey: 'studio.ai.quality.objectives', passed: true },
    { id: 'assessment', labelKey: 'studio.ai.quality.assessment', passed: true },
    { id: 'duration', labelKey: 'studio.ai.quality.duration', passed: false },
    {
      id: 'completeness',
      labelKey: 'studio.ai.quality.completeness',
      passed: true,
      detail: 'Fix the quiz title.',
    },
  ],
  outlinePreview: [
    { title: 'Intro', kind: 'lesson' },
    { title: 'Check', kind: 'quiz' },
  ],
  title: 'AI Course',
};

function renderReview(
  result: AiGenerateResult,
  handlers: Partial<{ onAccept: () => void; onReject: () => void }> = {},
) {
  render(
    wrap(
      <AiReviewView
        result={result}
        onAccept={handlers.onAccept ?? (() => {})}
        onReject={handlers.onReject ?? (() => {})}
      />,
    ),
  );
}

describe('AiReviewView', () => {
  it('renders the draft outline with kind badges', () => {
    renderReview(SUCCESS_RESULT);
    expect(screen.getByText('Review AI draft')).toBeInTheDocument();
    expect(screen.getByText('Draft outline')).toBeInTheDocument();
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('Lesson')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
  });

  it('renders quality checklist with passed and failed states', () => {
    renderReview(SUCCESS_RESULT);
    expect(screen.getByText('Quality check')).toBeInTheDocument();
    expect(screen.getByText('Learning goals look measurable')).toBeInTheDocument();
    expect(screen.getByText('Practice/quiz aligns with the lesson')).toBeInTheDocument();
    expect(screen.getByText('Estimated length is reasonable')).toBeInTheDocument();
    expect(screen.getByText('Required course fields are present')).toBeInTheDocument();
    expect(screen.getByText('Fix the quiz title.')).toBeInTheDocument();
  });

  it('calls onAccept when Accept draft is clicked', async () => {
    const onAccept = vi.fn();
    renderReview(SUCCESS_RESULT, { onAccept });
    await userEvent.click(screen.getByRole('button', { name: /accept draft/i }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onReject when Discard and start over is clicked', async () => {
    const onReject = vi.fn();
    renderReview(SUCCESS_RESULT, { onReject });
    await userEvent.click(screen.getByRole('button', { name: /discard and start over/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
