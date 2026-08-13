import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fs from 'fs';
import path from 'path';
import type { LoadedPackage } from '@open-edu/core';
import type { RewardReceipt } from '@open-edu/rewards';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import studioDict from '@open-edu/i18n/locales/en/studio.json';
import { createRewardReceiptBridge } from './createRewardReceiptBridge.js';

function renderWithI18n() {
  return render(
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict, studio: studioDict } }}>
      <DevApp />
    </I18nProvider>,
  );
}

const mockPackageData: LoadedPackage = {
  rootDir: '/test',
  manifest: {
    id: 'test',
    title: 'Test Package',
    version: '1.0.0',
    author: 'Test',
    entry: 'nodes/lesson.md',
  },
  workflow: {
    routing: {
      'nodes/lesson.md': { onComplete: 'COMPLETED' },
    },
  },
  rewards: {
    triggers: [
      {
        onEvent: 'node_complete',
        rewards: [{ action: 'badge.award', badge: 'First Steps' }],
      },
    ],
  },
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

vi.mock('virtual:open-edu-package', () => ({
  packageData: mockPackageData,
  bundleData: null,
}));

let capturedOnReceipt: ((receipt: RewardReceipt) => void) | undefined;

import type * as RewardsModule from '@open-edu/rewards';

vi.mock('@open-edu/rewards', async (importOriginal) => {
  const actual = await importOriginal<typeof RewardsModule>();
  return {
    ...actual,
    RewardBroker: class {
      constructor(opts: { onReceipt?: (receipt: RewardReceipt) => void }) {
        capturedOnReceipt = opts.onReceipt;
      }
      start() {}
      stop() {}
      updateContext() {}
    },
  };
});

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: () => <div data-testid="mocked-dotlottie" />,
  PlayerEvents: {},
}));

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    status: 'ready' as const,
    stop: vi.fn(),
    clearError: vi.fn(),
    setMessages: vi.fn(),
    error: undefined,
  }),
}));

const { DevApp } = await import('./DevApp');

describe('DevApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('hides developer inspector by default in creator mode', async () => {
    renderWithI18n();
    expect(
      screen.queryByRole('complementary', { name: 'Developer inspector panel' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Telemetry')).not.toBeInTheDocument();
    expect(await screen.findByText('OpenEdu Studio')).toBeInTheDocument();
  });

  it('switches to developer mode to show the inspector', async () => {
    renderWithI18n();
    expect(
      screen.queryByRole('complementary', { name: 'Developer inspector panel' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));

    expect(
      await screen.findByRole('complementary', { name: 'Developer inspector panel' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
  });

  it('switches back to creator mode from the developer shell', async () => {
    renderWithI18n();
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(
      await screen.findByRole('complementary', { name: 'Developer inspector panel' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));

    expect(await screen.findByText('OpenEdu Studio')).toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'Developer inspector panel' }),
    ).not.toBeInTheDocument();
  });

  it('should render the package title from the manifest in developer mode', async () => {
    renderWithI18n();
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(await screen.findByText('Test Package')).toBeInTheDocument();
  });

  it('should render the inspector panel in developer mode', async () => {
    renderWithI18n();
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(
      await screen.findByRole('complementary', { name: 'Developer inspector panel' }),
    ).toBeInTheDocument();
  });

  it('should render telemetry tab button in developer mode', async () => {
    renderWithI18n();
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(await screen.findByText('Telemetry')).toBeInTheDocument();
  });

  it('should render accessibility tab button in developer mode', async () => {
    renderWithI18n();
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(await screen.findByText('A11y')).toBeInTheDocument();
  });

  it('should render the reset progress button in developer mode', async () => {
    renderWithI18n();
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(await screen.findByText('Reset Progress')).toBeInTheDocument();
  });
});

describe('DevApp reward overlay wiring', () => {
  beforeEach(() => {
    capturedOnReceipt = undefined;
    localStorage.clear();
  });

  it('shows the reward overlay when the broker delivers a badge receipt', async () => {
    renderWithI18n();
    await userEvent.click(screen.getByRole('switch', { name: /studio mode/i }));
    expect(await screen.findByText('Test Package')).toBeInTheDocument();
    expect(capturedOnReceipt).toBeTypeOf('function');

    act(() => {
      capturedOnReceipt!({
        actionId: 'reward-test',
        actionType: 'badge.award',
        actionKey: 'First Steps',
        dispatchedAt: Date.now(),
        status: 'delivered',
      });
    });

    expect(await screen.findByTestId('reward-animation')).toBeInTheDocument();
    expect(screen.getByLabelText('Badge unlocked: First Steps')).toBeInTheDocument();
  });

  it('composes createRewardReceiptBridge and RewardEventBridge', () => {
    const src = fs.readFileSync(path.resolve(__dirname, './DevApp.tsx'), 'utf8');
    expect(src).toContain('createRewardReceiptBridge');
    expect(src).toContain('RewardEventBridge');
    expect(createRewardReceiptBridge).toBeTypeOf('function');
  });
});
