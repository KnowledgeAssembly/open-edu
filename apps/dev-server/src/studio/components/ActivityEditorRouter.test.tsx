import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { ActivityEditorRouter } from './ActivityEditorRouter';
import type { StudioApi } from '../studioApi.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

function makeApi(content: string, path = 'nodes/x.md'): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn(),
    saveOutlineOrder: vi.fn(),
    applyTemplate: vi.fn(),
    exportOep: vi.fn(),
    readFile: vi.fn().mockResolvedValue({ path, content }),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as StudioApi;
}

describe('ActivityEditorRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes markdown to the lesson editor', async () => {
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi('# Hi', 'nodes/l.md')}
          path="nodes/l.md"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByLabelText(/lesson content/i)).toBeInTheDocument();
  });

  it('routes quiz json to the quiz editor', async () => {
    const content = JSON.stringify({
      type: 'quiz',
      question: 'Q?',
      options: [
        { id: 'a', text: 'A', correct: true },
        { id: 'b', text: 'B', correct: false },
      ],
    });
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi(content, 'nodes/q.json')}
          path="nodes/q.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByLabelText(/question/i)).toBeInTheDocument();
  });

  it('routes practice json to the practice editor', async () => {
    const content = JSON.stringify({ type: 'exercise', widget: 'core.multiple-choice', config: {} });
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi(content, 'nodes/p.json')}
          path="nodes/p.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByLabelText(/lesson title/i)).toBeInTheDocument();
  });

  it('shows advanced-activity message for other activity types', async () => {
    const content = JSON.stringify({ type: 'reflection', prompt: 'Think about it' });
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi(content, 'nodes/r.json')}
          path="nodes/r.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(
      await screen.findByText('Open Developer mode for advanced activity types.'),
    ).toBeInTheDocument();
  });
});
