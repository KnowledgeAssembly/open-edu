import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import type { LoadedPackage } from '@open-edu/core';
import { getStorageKey } from '../progressStorage.js';
import { CreatorPreview } from './CreatorPreview';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider
      locale="en"
      dictionaries={{ en: { studio: studioEn as Record<string, string>, runtime: runtimeDict } }}
    >
      {ui}
    </I18nProvider>
  );
}

const mockPkg: LoadedPackage = {
  rootDir: '/test',
  manifest: {
    id: 'test',
    title: 'Test',
    version: '1.0.0',
    author: 'Test',
    entry: 'nodes/lesson.md',
  },
  workflow: {
    routing: {
      'nodes/lesson.md': { onComplete: 'COMPLETED' },
    },
  },
  rewards: null,
  cards: null,
  nodes: [
    {
      path: '/test/nodes/lesson.md',
      relativePath: 'nodes/lesson.md',
      content: '# Hello\nWorld',
      node: { type: 'lesson' },
    },
  ],
  assetPaths: [],
};

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: () => <div data-testid="mocked-dotlottie" />,
  PlayerEvents: {},
}));

describe('CreatorPreview', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the runtime without DevTools inspectors', async () => {
    render(wrap(<CreatorPreview pkg={mockPkg} />));
    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'Developer inspector panel' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Telemetry')).not.toBeInTheDocument();
  });

  it('shows a reset progress button', async () => {
    render(wrap(<CreatorPreview pkg={mockPkg} />));
    expect(await screen.findByRole('button', { name: /reset progress/i })).toBeInTheDocument();
  });

  it('calls onExit when Exit preview button is clicked', async () => {
    const onExit = vi.fn();
    render(wrap(<CreatorPreview pkg={mockPkg} onExit={onExit} />));
    await userEvent.click(await screen.findByRole('button', { name: /exit preview/i }));
    expect(onExit).toHaveBeenCalled();
  });

  it('renders a course outline sidebar for reference', async () => {
    render(wrap(<CreatorPreview pkg={mockPkg} />));
    expect(await screen.findByTestId('step-nodes/lesson.md')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('reset progress resets the runtime activity state', async () => {
    localStorage.setItem(
      getStorageKey('test', '1.0.0'),
      JSON.stringify({
        packageId: 'test',
        packageVersion: '1.0.0',
        currentNodeId: 'nodes/lesson.md',
        visitedNodes: ['nodes/lesson.md'],
        scores: { 'nodes/lesson.md': 100 },
        answers: {},
        isCompleted: true,
        updatedAt: new Date().toISOString(),
      }),
    );

    render(wrap(<CreatorPreview pkg={mockPkg} />));
    expect(
      await screen.findByText('You have completed this learning experience.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));

    expect(
      screen.queryByText('You have completed this learning experience.'),
    ).not.toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(getStorageKey('test', '1.0.0')) ?? '{}');
    expect(saved.isCompleted).toBe(false);
    expect(saved.scores).toEqual({});
  });
});
