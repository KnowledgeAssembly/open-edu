import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DotLottiePlayer } from '../DotLottiePlayer.js';

vi.mock('@dotlottie/react-player', () => ({  DotLottiePlayer: ({
    onEvent,
    testId,
    ...props
  }: {
    onEvent: (name: string) => void;
    testId?: string;
    [key: string]: unknown;
  }) => (
    <div data-testid={testId ?? 'mocked-dotlottie'} data-props={JSON.stringify(props)}>
      <button
        data-testid="mock-emit-complete"
        onClick={() => onEvent('complete')}
      >
        complete
      </button>
      <button data-testid="mock-emit-pause" onClick={() => onEvent('pause')}>
        pause
      </button>
      <button data-testid="mock-emit-ready" onClick={() => onEvent('ready')}>
        ready
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
  return <>{children}</>;
}

describe('DotLottiePlayer', () => {
  it('renders the dotLottie player with expected props', () => {
    const { container } = render(
      <DotLottiePlayer src="water-cycle.lottie" autoplay loop speed={1.5} ariaLabel="Water cycle" />,
      { wrapper },
    );
    const el = screen.getByTestId('oas-dotlottie-player');
    const props = JSON.parse(el.getAttribute('data-props') ?? '{}');
    expect(props.src).toBe('water-cycle.lottie');
    expect(props.autoplay).toBe(true);
    expect(props.loop).toBe(true);
    expect(props.speed).toBe(1.5);
    expect(container.innerHTML).toContain('Water cycle');
  });

  it('maps complete event to completed status', () => {
    const onEvent = vi.fn();
    render(
      <DotLottiePlayer src="water-cycle.lottie" ariaLabel="Water cycle" onEvent={onEvent} />,
      { wrapper },
    );
    screen.getByTestId('mock-emit-complete').click();
    expect(onEvent).toHaveBeenCalledWith('completed');
  });

  it('maps pause event to paused status', () => {
    const onEvent = vi.fn();
    render(
      <DotLottiePlayer src="water-cycle.lottie" ariaLabel="Water cycle" onEvent={onEvent} />,
      { wrapper },
    );
    screen.getByTestId('mock-emit-pause').click();
    expect(onEvent).toHaveBeenCalledWith('paused');
  });

  it('renders static fallback', () => {
    const onEvent = vi.fn();
    render(
      <DotLottiePlayer
        src="water-cycle.lottie"
        ariaLabel="Water cycle"
        onEvent={onEvent}
        staticFallback={<div data-testid="static-pose">Static pose</div>}
      />,
      { wrapper },
    );
    expect(screen.getByTestId('static-pose')).toBeInTheDocument();
    expect(screen.queryByTestId('oas-dotlottie-player')).not.toBeInTheDocument();
  });

  it('applies theme colors as inline CSS variables', () => {
    render(
      <DotLottiePlayer
        src="water-cycle.lottie"
        ariaLabel="Water cycle"
        themeColors={{ '--oe-color-primary': '#6750a4' }}
      />,
      { wrapper },
    );
    const container = document.querySelector('[style]');
    expect(container?.getAttribute('style')).toContain('--oe-color-primary');
  });
});
