import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { ItemDraftPreview } from './ItemDraftPreview';
import type { DraftItem } from '../ai/types.js';

vi.mock('../../editor/WidgetPreviewPanel.js', () => ({
  WidgetPreviewPanel: ({ widgetType }: { widgetType: string }) => (
    <div data-testid="widget-preview">{widgetType}</div>
  ),
}));

vi.mock('../../editor/WidgetValidator.js', () => ({
  validateWidgetConfigForType: () => [],
}));

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

function quizItem(options: Array<{ text: string; correct: boolean }>): DraftItem {
  return {
    kind: 'quiz',
    title: 'Quiz',
    content: JSON.stringify(
      {
        type: 'quiz',
        question: 'Q?',
        options: options.map((option, i) => ({
          id: String.fromCharCode(97 + i),
          text: option.text,
          correct: option.correct,
        })),
      },
      null,
      2,
    ),
  };
}

describe('ItemDraftPreview', () => {
  it('renders a lesson as markdown', () => {
    render(
      wrap(
        <ItemDraftPreview
          item={{ kind: 'lesson', title: 'Fractions', content: '# Fractions\n\nBody text' }}
        />,
      ),
    );
    expect(screen.getByRole('heading', { name: 'Fractions' })).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });

  it('renders a quiz with question and options', () => {
    render(
      wrap(
        <ItemDraftPreview
          item={quizItem([
            { text: 'Alpha', correct: true },
            { text: 'Beta', correct: false },
          ])}
        />,
      ),
    );
    expect(screen.getByText('Q?')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('highlights changed options by index against the current content', () => {
    const current = quizItem([
      { text: 'Alpha', correct: true },
      { text: 'Beta', correct: false },
      { text: 'Gamma', correct: false },
    ]);
    const draft = quizItem([
      { text: 'Alpha', correct: true },
      { text: 'CHANGED', correct: false },
      { text: 'Gamma', correct: false },
      { text: 'NEW', correct: false },
    ]);
    render(wrap(<ItemDraftPreview item={draft} currentContent={current.content} />));
    const rows = screen.getAllByText(/Alpha|CHANGED|Gamma|NEW/);
    const changedRow = rows.find((row) => row.textContent === 'CHANGED')?.closest('div');
    expect(changedRow?.className).toContain('border-primary');
    const newRow = rows.find((row) => row.textContent === 'NEW')?.closest('div');
    expect(newRow?.className).toContain('bg-primary-container');
  });

  it('falls back to a JSON block when practice content is unparseable', () => {
    render(
      wrap(<ItemDraftPreview item={{ kind: 'practice', title: 'P', content: '{ not json' }} />),
    );
    expect(screen.getByText('{ not json')).toBeInTheDocument();
  });

  it('renders a practice via the widget preview when the node parses', () => {
    render(
      wrap(
        <ItemDraftPreview
          item={{
            kind: 'practice',
            title: 'P',
            content: JSON.stringify({
              type: 'exercise',
              widget: 'core.multiple-choice',
              config: {},
            }),
          }}
        />,
      ),
    );
    expect(screen.getByTestId('widget-preview')).toHaveTextContent('core.multiple-choice');
  });
});
