import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
const saveOutlineOrderMock = vi.fn().mockResolvedValue({ success: true });

vi.mock('./studioApi.js', () => ({
  createStudioApi: () => ({
    getPackageDir: vi.fn(),
    validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
    getOutline: getOutlineMock,
    saveOutlineOrder: saveOutlineOrderMock,
    applyTemplate: applyTemplateMock,
    exportOep: vi.fn(),
    readFile: readFileMock,
    writeFile: vi.fn().mockResolvedValue({ success: true }),
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
    localStorage.clear();
    sessionStorage.clear();
  });

  async function useTemplateAndConfirm() {
    await userEvent.click(screen.getAllByRole('button', { name: /use template/i })[0]!);
    await userEvent.click(screen.getByRole('button', { name: /replace and continue/i }));
  }

  it('renders studio chrome with mode toggle', () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    expect(screen.getByText('OpenEdu Studio')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /studio mode/i })).toBeInTheDocument();
  });

  it('starts on Home with template gallery', () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    expect(screen.getByText('Reading lesson')).toBeInTheDocument();
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
    const editButtons = await screen.findAllByRole('button', { name: /edit/i });
    await userEvent.click(editButtons[0]!);
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
    expect(screen.getByText('Learning path', { selector: 'summary' })).toBeInTheDocument();
    expect(screen.getByText('Rewards & cards', { selector: 'summary' })).toBeInTheDocument();
  });

  it('renders flow and rewards panel content when expanded', async () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} loadedPackage={mockPkg} />));
    await userEvent.click(screen.getByRole('button', { name: /outline/i }));
    await screen.findByText('Intro');
    await userEvent.click(screen.getByText('Learning path', { selector: 'summary' }));
    expect(await screen.findByRole('button', { name: /add a score rule/i })).toBeInTheDocument();
    await userEvent.click(screen.getByText('Rewards & cards', { selector: 'summary' }));
    expect(
      await screen.findByRole('button', { name: /add completion badge/i }),
    ).toBeInTheDocument();
  });
});
