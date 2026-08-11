import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { StudioApp } from './StudioApp';
import type { LoadedPackage } from '@open-edu/core';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const applyTemplateMock = vi.fn();
const getOutlineMock = vi.fn().mockResolvedValue({
  title: 'Test',
  activities: [
    { id: 'nodes/lesson.md', path: 'nodes/lesson.md', title: 'Intro', kind: 'lesson' },
    { id: 'nodes/q.json', path: 'nodes/q.json', title: 'Check', kind: 'quiz' },
  ],
});
const readFileMock = vi
  .fn()
  .mockImplementation((path: string) =>
    Promise.resolve({ path, content: path.endsWith('.json') ? '{"type":"quiz"}' : '# Hi' }),
  );
const writeFileMock = vi.fn().mockResolvedValue({ success: true });
const saveOutlineOrderMock = vi.fn().mockResolvedValue({ success: true });
const getAiStatusMock = vi.fn().mockResolvedValue({ available: false });
const generateFromNotesMock = vi.fn().mockResolvedValue({
  success: false,
  quality: [],
  outlinePreview: [],
  error: 'Add more detail',
});

const { mockBatchApply } = vi.hoisted(() => ({ mockBatchApply: vi.fn() }));

vi.mock('./components/AiEditPanel.js', () => ({
  AiEditPanel: ({ onApplyBatch }: { onApplyBatch: (items: unknown[]) => void }) => {
    mockBatchApply.mockImplementation(onApplyBatch);
    return <div data-testid="ai-edit-panel" />;
  },
}));

vi.mock('./studioApi.js', () => ({
  createStudioApi: () => ({
    getPackageDir: vi.fn().mockResolvedValue('/test'),
    validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
    getOutline: getOutlineMock,
    saveOutlineOrder: saveOutlineOrderMock,
    applyTemplate: applyTemplateMock,
    exportOep: vi.fn(),
    readFile: readFileMock,
    writeFile: writeFileMock,
    getAiStatus: getAiStatusMock,
    generateFromNotes: generateFromNotesMock,
    getLibrary: vi.fn().mockResolvedValue({
      workspace: '/workspace',
      entries: [
        {
          id: 'fractions',
          title: 'Fractions',
          kind: 'course',
          relativePath: 'fractions',
          version: '1.0.0',
          updatedAt: 1,
        },
      ],
    }),
    openLibraryCourse: vi
      .fn()
      .mockResolvedValue({ success: true, packageDir: '/workspace/fractions' }),
    duplicateCourse: vi.fn(),
    renameCourse: vi.fn(),
    archiveCourse: vi.fn(),
    importCourseFolder: vi.fn(),
    createUnit: vi.fn(),
    exportUnitOep: vi.fn(),
  }),
}));

const mockPkg: LoadedPackage = {
  rootDir: '/test',
  manifest: {
    id: 'test',
    title: 'Test',
    version: '1.0.0',
    author: 'Test',
    entry: 'nodes/lesson.md',
  },
  workflow: { routing: { 'nodes/lesson.md': { onComplete: 'COMPLETED' } } },
  rewards: null,
  cards: null,
  nodes: [],
  assetPaths: [],
};

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: () => <div data-testid="mocked-dotlottie" />,
  PlayerEvents: {},
}));

describe('StudioApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAiStatusMock.mockResolvedValue({ available: false });
    generateFromNotesMock.mockResolvedValue({
      success: false,
      quality: [],
      outlinePreview: [],
      error: 'Add more detail',
    });
    localStorage.clear();
    sessionStorage.clear();
  });

  async function useTemplateAndConfirm() {
    const templateCards = await screen.findAllByRole('button', { name: /reading lesson/i });
    await userEvent.click(templateCards[0]!);
    await userEvent.click(screen.getByRole('button', { name: /use template/i }));
    await userEvent.click(screen.getByRole('button', { name: /replace and continue/i }));
  }

  it('renders studio chrome with mode toggle', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    expect(await screen.findByText('OpenEdu Studio')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /studio mode/i })).toBeInTheDocument();
  });

  it('starts on Home with template gallery', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    expect(await screen.findByText('Reading lesson')).toBeInTheDocument();
  });

  it('navigates to outline after opening a template', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await useTemplateAndConfirm();
    expect(await screen.findByText('Intro')).toBeInTheDocument();
  });

  it('navigates to share via top bar nav', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await useTemplateAndConfirm();
    await userEvent.click(await screen.findByRole('button', { name: /share/i }));
    expect(await screen.findByText('Ready check')).toBeInTheDocument();
  });

  it('opens the activity editor from the outline', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await useTemplateAndConfirm();
    await screen.findByText('Intro');
    await userEvent.click(screen.getByRole('button', { name: 'Intro' }));
    expect(await screen.findByLabelText(/lesson content/i)).toBeInTheDocument();
  });

  it('records a recent course when opening a template', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await useTemplateAndConfirm();
    await screen.findByText('Intro');
    const recent = localStorage.getItem('openedu.studio.recent');
    expect(recent).toBeTruthy();
    const parsed = JSON.parse(recent!);
    expect(parsed[0].id).toBe('test');
  });

  it('reaches outline directly from Home via the top bar (no dead end)', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await userEvent.click(screen.getByRole('button', { name: /outline/i }));
    expect(await screen.findByText('Intro')).toBeInTheDocument();
  });

  it('restores the last view after a full reload (session persistence)', async () => {
    sessionStorage.setItem('openedu.studio.view', 'outline');
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    expect(await screen.findByText('Intro')).toBeInTheDocument();
  });

  it('navigates Home to the loaded package via Open this course', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await userEvent.click(screen.getByRole('button', { name: /open this course/i }));
    expect(await screen.findByText('Intro')).toBeInTheDocument();
  });

  it('shows an unsupported shell for bundles without package mutations', () => {
    render(
      wrap(
        <StudioApp mode="creator" onModeChange={() => {}} loadedPackage={null} bundleUnsupported />,
      ),
    );
    expect(screen.getByText('Bundles need Developer mode')).toBeInTheDocument();
    expect(screen.queryByText('Reading lesson')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /outline/i })).not.toBeInTheDocument();
  });

  it('exposes the Learning path and Rewards & cards panels from the outline', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await userEvent.click(screen.getByRole('button', { name: /outline/i }));
    await screen.findByText('Intro');
    expect(screen.getByRole('button', { name: /learning path/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rewards & cards/i })).toBeInTheDocument();
  });

  it('renders flow and rewards panel content when expanded', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await userEvent.click(screen.getByRole('button', { name: /outline/i }));
    await screen.findByText('Intro');
    await userEvent.click(screen.getByRole('button', { name: /learning path/i }));
    expect(await screen.findByRole('button', { name: /add a score rule/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /rewards & cards/i }));
    expect(
      await screen.findByRole('button', { name: /add completion badge/i }),
    ).toBeInTheDocument();
  });

  it('navigates to the library via the My courses top-bar button', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    const myCourses = await screen.findAllByRole('button', { name: /my courses/i });
    await userEvent.click(myCourses[0]!);
    expect(await screen.findByText('Fractions')).toBeInTheDocument();
  });

  it('opens a library course into the outline view', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    const myCourses = await screen.findAllByRole('button', { name: /my courses/i });
    await userEvent.click(myCourses[0]!);
    await userEvent.click(await screen.findByRole('button', { name: /^open$/i }));
    expect(await screen.findByText('Intro')).toBeInTheDocument();
  });

  it('reaches the unit-builder placeholder from the library', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    const myCourses = await screen.findAllByRole('button', { name: /my courses/i });
    await userEvent.click(myCourses[0]!);
    await userEvent.click(await screen.findByRole('button', { name: /create unit/i }));
    expect(await screen.findByText('Create a unit')).toBeInTheDocument();
  });

  it('generates a draft from notes and navigates to the AI review view', async () => {
    getAiStatusMock.mockResolvedValue({ available: true });
    generateFromNotesMock.mockResolvedValue({
      success: true,
      quality: [{ id: 'objectives', labelKey: 'studio.ai.quality.objectives', passed: true }],
      outlinePreview: [{ title: 'Intro', kind: 'lesson' }],
      title: 'AI Course',
    });
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    const textarea = await screen.findByLabelText(/your notes/i);
    await userEvent.type(textarea, 'Teach fractions to beginners.');
    await userEvent.click(screen.getByRole('button', { name: /generate draft/i }));
    expect(await screen.findByText('Review AI draft')).toBeInTheDocument();
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Learning goals look measurable')).toBeInTheDocument();
  });

  it('handleSaveDraftItems writes quiz files, re-reads order, saves combined order, and navigates to outline', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await userEvent.click(screen.getByRole('button', { name: /outline/i }));
    await screen.findByText('Intro');
    await userEvent.click(screen.getByRole('button', { name: /activity actions for check/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /edit/i }));
    await screen.findByLabelText(/question/i);
    await waitFor(() => expect(mockBatchApply).toBeDefined());
    mockBatchApply.mockClear();
    writeFileMock.mockClear();
    saveOutlineOrderMock.mockClear();

    const quizDraft = (title: string) => ({
      kind: 'quiz' as const,
      title,
      content: JSON.stringify({
        type: 'quiz',
        question: 'Q?',
        options: [
          { id: 'a', text: 'A', correct: true },
          { id: 'b', text: 'B', correct: false },
          { id: 'c', text: 'C', correct: false },
          { id: 'd', text: 'D', correct: false },
        ],
      }),
    });

    mockBatchApply([quizDraft('Q1'), quizDraft('Q2')]);

    await waitFor(() => {
      expect(writeFileMock).toHaveBeenCalledTimes(2);
    });
    const writtenPaths = writeFileMock.mock.calls.map((call) => call[0]) as string[];
    for (const path of writtenPaths) {
      expect(path).toMatch(/^nodes\/quiz-\d+\.json$/);
    }
    await waitFor(() => {
      expect(saveOutlineOrderMock).toHaveBeenCalled();
    });
    const orderCall = saveOutlineOrderMock.mock.calls.at(-1)![0] as string[];
    expect(orderCall).toEqual(['nodes/lesson.md', 'nodes/q.json', ...writtenPaths]);
    expect(await screen.findByText('Intro')).toBeInTheDocument();
  });
});
