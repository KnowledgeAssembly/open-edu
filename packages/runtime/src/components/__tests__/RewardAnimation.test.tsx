import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { RewardAnimation } from '../RewardAnimation.js';

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

vi.mock('../OasAnimationWrapper', () => ({
  OasAnimationWrapper: ({
    config,
    ariaLabel,
    onComplete,
  }: {
    config: { src?: string };
    ariaLabel?: string;
    onComplete?: () => void;
  }) => (
    <div
      data-testid="oas-wrapper"
      data-src={config?.src ?? 'no-src'}
      data-aria-label={ariaLabel ?? ''}
    >
      <button data-testid="trigger-complete" onClick={onComplete}>
        complete
      </button>
    </div>
  ),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

describe('RewardAnimation', () => {
  it('renders badge-unlock animation', () => {
    render(<RewardAnimation type="badge-unlock" badgeName="First Steps" />, { wrapper });
    expect(screen.getByTestId('oas-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-src')).toContain('badge-unlock');
  });

  it('renders confetti animation', () => {
    render(<RewardAnimation type="confetti" />, { wrapper });
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-src')).toContain('confetti');
  });

  it('renders xp-gain animation', () => {
    render(<RewardAnimation type="xp-gain" xpAmount={50} />, { wrapper });
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-src')).toContain('xp-gain');
  });

  it('renders milestone animation', () => {
    render(<RewardAnimation type="milestone" />, { wrapper });
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-src')).toContain('milestone');
  });

  it('calls onComplete when animation completes', () => {
    const onComplete = vi.fn();
    render(<RewardAnimation type="confetti" onComplete={onComplete} />, { wrapper });
    screen.getByTestId('trigger-complete').click();
    expect(onComplete).toHaveBeenCalled();
  });

  it('announces badge unlocks via aria label', () => {
    render(<RewardAnimation type="badge-unlock" badgeName="First Steps" />, { wrapper });
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-aria-label')).toContain(
      'Badge unlocked: First Steps',
    );
  });
});
