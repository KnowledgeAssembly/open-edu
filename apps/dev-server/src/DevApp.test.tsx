import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import type { LoadedPackage } from '@open-edu/core';
import type { RewardReceipt } from '@open-edu/rewards';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { createRewardReceiptBridge } from './createRewardReceiptBridge.js';

function renderWithI18n() {
  return render(
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
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

const { DevApp } = await import('./DevApp');

describe('DevApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the package title from the manifest', async () => {
    render(<DevApp />);
    expect(await screen.findByText('Test Package')).toBeInTheDocument();
  });

  it('should render the inspector panel', async () => {
    render(<DevApp />);
    expect(
      await screen.findByRole('complementary', { name: 'Developer inspector panel' }),
    ).toBeInTheDocument();
  });

  it('should render telemetry tab button', async () => {
    render(<DevApp />);
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
  });

  it('should render accessibility tab button', async () => {
    render(<DevApp />);
    expect(screen.getByText('A11y')).toBeInTheDocument();
  });

  it('should render the reset progress button', async () => {
    render(<DevApp />);
    expect(screen.getByText('Reset Progress')).toBeInTheDocument();
  });
});

describe('DevApp reward overlay wiring', () => {
  beforeEach(() => {
    capturedOnReceipt = undefined;
  });

  it('shows the reward overlay when the broker delivers a badge receipt', async () => {
    renderWithI18n();
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
