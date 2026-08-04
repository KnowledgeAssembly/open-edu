import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { RewardEventBridge } from '@open-edu/runtime';
import type { RewardReceipt } from '@open-edu/rewards';
import { createRewardReceiptBridge } from '../createRewardReceiptBridge.js';

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: ({ onEvent }: { onEvent: (name: string) => void }) => (
    <div data-testid="mocked-dotlottie">
      <button data-testid="emit-complete" onClick={() => onEvent('complete')}>
        complete
      </button>
    </div>
  ),
  PlayerEvents: {
    Complete: 'complete',
    Pause: 'pause',
    Ready: 'ready',
    Play: 'play',
    DataReady: 'data_ready',
    Error: 'error',
    Stop: 'stop',
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

function deliveredReceipt(overrides: Partial<RewardReceipt>): RewardReceipt {
  return {
    actionId: 'reward-test',
    actionType: 'badge.award',
    actionKey: 'First Steps',
    dispatchedAt: Date.now(),
    status: 'delivered',
    ...overrides,
  };
}

describe('createRewardReceiptBridge', () => {
  it('forwards onReceipt into RewardEventBridge', async () => {
    const bridge = createRewardReceiptBridge();
    render(<RewardEventBridge receipts$={bridge.receipts$} />, { wrapper });

    expect(screen.queryByTestId('reward-animation')).not.toBeInTheDocument();

    act(() => {
      bridge.onReceipt(deliveredReceipt({}));
    });

    expect(await screen.findByTestId('reward-animation')).toBeInTheDocument();
    expect(screen.getByLabelText('Badge unlocked: First Steps')).toBeInTheDocument();
  });

  it('shows XP gain overlay with the amount', async () => {
    const bridge = createRewardReceiptBridge();
    render(<RewardEventBridge receipts$={bridge.receipts$} />, { wrapper });

    act(() => {
      bridge.onReceipt(deliveredReceipt({ actionType: 'xp.award', detail: '50' }));
    });

    expect(await screen.findByTestId('reward-animation')).toBeInTheDocument();
    expect(screen.getByLabelText('Gained 50 XP')).toBeInTheDocument();
  });

  it('does not show an overlay for non-delivered receipts', () => {
    const bridge = createRewardReceiptBridge();
    render(<RewardEventBridge receipts$={bridge.receipts$} />, { wrapper });

    act(() => {
      bridge.onReceipt(deliveredReceipt({ status: 'skipped', detail: 'Condition not met' }));
    });

    expect(screen.queryByTestId('reward-animation')).not.toBeInTheDocument();
  });
});

describe('CourseRuntime reward wiring', () => {
  it('composes the receipt bridge and RewardEventBridge', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../CourseRuntime.tsx'), 'utf8');
    expect(src).toContain('createRewardReceiptBridge');
    expect(src).toContain('RewardEventBridge');
    expect(src).toMatch(/bridge\.onReceipt\(receipt\)|rewardBridge\.onReceipt\(receipt\)/);
  });
});
