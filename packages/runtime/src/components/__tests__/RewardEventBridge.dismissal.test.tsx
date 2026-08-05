import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Subject } from 'rxjs';
import type { RewardReceipt } from '@open-edu/rewards';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { RewardEventBridge } from '../RewardEventBridge.js';

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: ({ onEvent }: { onEvent?: (name: string) => void }) => (
    <div data-testid="mocked-dotlottie">
      <button data-testid="mock-error" onClick={() => onEvent?.('error')}>
        error
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

describe('RewardEventBridge overlay dismissal', () => {
  it('dismisses the overlay after CSS fallback completes', async () => {
    const receipts$ = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={receipts$} />, { wrapper });

    act(() => {
      receipts$.next({
        actionId: 'r1',
        actionType: 'badge.award',
        actionKey: 'First Steps',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: '',
      } as RewardReceipt);
    });

    expect(await screen.findByTestId('reward-animation')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-error'));
    const cssRoot = await screen.findByTestId('css-animation-renderer');
    act(() => {
      cssRoot.dispatchEvent(new Event('animationend', { bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('reward-animation')).not.toBeInTheDocument();
    });
  });
});
