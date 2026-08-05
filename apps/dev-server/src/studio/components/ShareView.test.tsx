import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { ShareView } from './ShareView';
import type { StudioApi } from '../studioApi.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const validLesson = '# Fractions\n\nHello';
const validQuiz = JSON.stringify({
  type: 'quiz',
  question: 'Q?',
  options: [
    { id: 'a', text: 'A', correct: true },
    { id: 'b', text: 'B', correct: false },
  ],
});

function makeApi(overrides: Partial<StudioApi> = {}): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
    getOutline: vi.fn().mockResolvedValue({
      title: 'Fractions',
      activities: [
        { id: 'nodes/lesson.md', path: 'nodes/lesson.md', title: 'Lesson', kind: 'lesson' },
        { id: 'nodes/q.json', path: 'nodes/q.json', title: 'Quiz', kind: 'quiz' },
      ],
    }),
    saveOutlineOrder: vi.fn(),
    applyTemplate: vi.fn(),
    exportOep: vi
      .fn()
      .mockResolvedValue({ blob: new Blob(['x']), fileName: 'fractions-1.0.0.oep' }),
    readFile: vi.fn().mockImplementation((path: string) =>
      Promise.resolve({
        path,
        content: path.endsWith('.json') ? validQuiz : validLesson,
      }),
    ),
    writeFile: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

describe('ShareView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:url');
    URL.revokeObjectURL = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
      configurable: true,
    });
  });

  it('enables export when all ready checks pass', async () => {
    render(wrap(<ShareView api={makeApi()} onError={() => {}} />));
    const exportButton = await screen.findByRole('button', { name: /export \.oep file/i });
    expect(exportButton).toBeEnabled();
  });

  it('disables export when quiz lacks a correct answer', async () => {
    const badQuiz = JSON.stringify({
      type: 'quiz',
      question: 'Q?',
      options: [
        { id: 'a', text: 'A', correct: false },
        { id: 'b', text: 'B', correct: false },
      ],
    });
    const api = makeApi({
      readFile: vi
        .fn()
        .mockImplementation((path: string) =>
          Promise.resolve({ path, content: path.endsWith('.json') ? badQuiz : validLesson }),
        ),
    });
    render(wrap(<ShareView api={api} onError={() => {}} />));
    const exportButton = await screen.findByRole('button', { name: /export \.oep file/i });
    expect(exportButton).toBeDisabled();
  });

  it('disables export when validation reports errors', async () => {
    const api = makeApi({
      validate: vi.fn().mockResolvedValue({
        valid: false,
        errors: [{ path: 'workflow.json', error: 'bad' }],
      }),
    });
    render(wrap(<ShareView api={api} onError={() => {}} />));
    const exportButton = await screen.findByRole('button', { name: /export \.oep file/i });
    expect(exportButton).toBeDisabled();
  });

  it('triggers a browser download on export', async () => {
    const api = makeApi();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(wrap(<ShareView api={api} onError={() => {}} />));
    const exportButton = await screen.findByRole('button', { name: /export \.oep file/i });
    await userEvent.click(exportButton);
    expect(api.exportOep).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('copies how-to instructions', async () => {
    render(wrap(<ShareView api={makeApi()} onError={() => {}} />));
    await screen.findByRole('button', { name: /export \.oep file/i });
    await userEvent.click(screen.getByRole('button', { name: /copy instructions/i }));
    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalled();
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });
});
