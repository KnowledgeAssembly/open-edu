import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { OasAnimationWrapper } from '../OasAnimationWrapper.js';

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: ({
    onEvent,
    autoplay,
  }: {
    onEvent?: (name: string) => void;
    autoplay?: boolean;
  }) => (
    <div data-testid="mocked-dotlottie" data-autoplay={String(autoplay)}>
      <button data-testid="mock-complete" onClick={() => onEvent?.('complete')}>
        complete
      </button>
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

const lottieConfig = {
  backend: 'lottie',
  src: 'assets/animations/water-cycle.lottie',
  trigger: 'load',
  loop: true,
};

describe('OasAnimationWrapper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the dotLottie player for lottie backend', () => {
    render(<OasAnimationWrapper config={lottieConfig} />, { wrapper });
    expect(screen.getByTestId('mocked-dotlottie')).toBeInTheDocument();
  });

  it('resolves relative src against assetBaseUrl', () => {
    render(<OasAnimationWrapper config={lottieConfig} assetBaseUrl="/course" />, { wrapper });
    const el = screen.getByTestId('mocked-dotlottie');
    expect(el).toBeInTheDocument();
  });

  it('uses resolveSrc when provided', () => {
    const resolveSrc = vi.fn((src: string) => `/resolved/${src}`);
    render(<OasAnimationWrapper config={lottieConfig} resolveSrc={resolveSrc} />, { wrapper });
    expect(resolveSrc).toHaveBeenCalledWith('assets/animations/water-cycle.lottie');
    expect(screen.getByTestId('mocked-dotlottie')).toBeInTheDocument();
  });

  it('renders staticChildren when config is missing src', () => {
    render(
      <OasAnimationWrapper config={{ backend: 'lottie' }} staticChildren={<p>Fallback</p>} />,
      { wrapper },
    );
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  it('renders staticChildren for OS reduced motion', () => {
    const matchMediaMock = vi.fn((query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMediaMock);

    render(<OasAnimationWrapper config={lottieConfig} staticChildren={<p>Static</p>} />, {
      wrapper,
    });
    expect(screen.getByText('Static')).toBeInTheDocument();
    expect(screen.queryByTestId('mocked-dotlottie')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('renders svg backend as an image', () => {
    render(
      <OasAnimationWrapper
        config={{ backend: 'svg', src: 'diagrams/heart.svg' }}
        assetBaseUrl="/course"
      />,
      { wrapper },
    );
    expect(screen.getByTestId('oas-svg-backend')).toBeInTheDocument();
  });

  it('renders css backend with CssAnimationRenderer', () => {
    render(
      <OasAnimationWrapper
        config={{ backend: 'css', effects: [{ target: 'feedback', effect: 'highlight' }] }}
        staticChildren={<p>CSS content</p>}
      />,
      { wrapper },
    );
    expect(screen.getByTestId('oas-css-backend')).toBeInTheDocument();
    expect(screen.getByTestId('css-animation-renderer')).toBeInTheDocument();
    expect(screen.getByText('CSS content')).toBeInTheDocument();
  });

  it('renders canvas backend with CanvasAnimationRenderer', () => {
    render(
      <OasAnimationWrapper
        config={{
          backend: 'canvas',
          effects: [{ target: 'bar-0', effect: 'flow', step: 30 }],
        }}
      />,
      { wrapper },
    );
    expect(screen.getByTestId('oas-canvas-backend')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-animation-renderer')).toBeInTheDocument();
  });

  it('falls back to CssAnimationRenderer when the lottie player errors with effects', () => {
    render(
      <OasAnimationWrapper
        config={{
          backend: 'lottie',
          src: 'assets/animations/water-cycle.lottie',
          effects: [{ target: 'evaporation', effect: 'fade' }],
        }}
        staticChildren={<p>Static</p>}
      />,
      { wrapper },
    );
    expect(screen.getByTestId('mocked-dotlottie')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-error'));
    expect(screen.getByTestId('css-animation-renderer')).toBeInTheDocument();
    expect(screen.getByText('Static')).toBeInTheDocument();
    expect(screen.queryByTestId('mocked-dotlottie')).not.toBeInTheDocument();
  });

  it('renders controls when showControls is true and toggles status', () => {
    render(<OasAnimationWrapper config={lottieConfig} showControls />, { wrapper });

    expect(screen.getByTestId('oas-control-pause')).toBeInTheDocument();
    expect(screen.getByTestId('oas-control-next')).toBeInTheDocument();
    expect(screen.getByTestId('oas-control-prev')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('oas-control-pause'));
    expect(screen.getByTestId('oas-control-play')).toBeInTheDocument();
  });

  it('renders the speed selector and updates controller speed', () => {
    render(<OasAnimationWrapper config={lottieConfig} showControls />, { wrapper });

    const speed = screen.getByTestId('oas-control-speed') as HTMLSelectElement;
    expect(speed).toBeInTheDocument();
    expect(speed).toHaveAccessibleName('Animation speed');

    fireEvent.change(speed, { target: { value: '2' } });
    expect(speed.value).toBe('2');
  });

  it('returns null when config is invalid and no staticChildren', () => {
    const { container } = render(<OasAnimationWrapper config={{ backend: 'flash' }} />, {
      wrapper,
    });
    expect(container.querySelector('[data-testid="oas-lottie-backend"]')).toBeNull();
    expect(container.querySelector('[data-testid="oas-svg-backend"]')).toBeNull();
    expect(container.querySelector('[data-testid="oas-static-fallback"]')).toBeNull();
  });

  it('autoplays for step-triggered configs (segment restricts range)', () => {
    render(
      <OasAnimationWrapper
        config={{ backend: 'lottie', src: 'assets/animations/water-cycle.lottie', trigger: 'step' }}
      />,
      { wrapper },
    );
    expect(screen.getByTestId('mocked-dotlottie').dataset.autoplay).toBe('true');
  });

  it('does not autoplay for manually-triggered configs', () => {
    render(
      <OasAnimationWrapper
        config={{
          backend: 'lottie',
          src: 'assets/animations/water-cycle.lottie',
          trigger: 'click',
        }}
      />,
      { wrapper },
    );
    expect(screen.getByTestId('mocked-dotlottie').dataset.autoplay).toBe('false');
  });

  it('renders preserved children below the lottie player', () => {
    render(
      <OasAnimationWrapper config={lottieConfig} preserveChildren staticChildren={<p>Body</p>} />,
      { wrapper },
    );
    expect(screen.getByTestId('mocked-dotlottie')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('renders preserved children below the svg image', () => {
    render(
      <OasAnimationWrapper
        config={{ backend: 'svg', src: 'diagrams/heart.svg' }}
        assetBaseUrl="/course"
        preserveChildren
        staticChildren={<p>Body</p>}
      />,
      { wrapper },
    );
    expect(screen.getByTestId('oas-svg-backend')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('falls back to static children when the player errors', () => {
    render(<OasAnimationWrapper config={lottieConfig} staticChildren={<p>Static</p>} />, {
      wrapper,
    });
    expect(screen.getByTestId('mocked-dotlottie')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-error'));
    expect(screen.getByText('Static')).toBeInTheDocument();
    expect(screen.queryByTestId('mocked-dotlottie')).not.toBeInTheDocument();
  });

  it('calls onComplete when lottie errors and CSS fallback finishes', () => {
    const onComplete = vi.fn();
    render(
      <OasAnimationWrapper
        config={{
          backend: 'lottie',
          src: 'assets/rewards/missing.lottie',
          effects: [{ target: 'badge', effect: 'badge' }],
        }}
        onComplete={onComplete}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('mock-error'));
    const cssRoot = screen.getByTestId('css-animation-renderer');
    cssRoot.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(onComplete).toHaveBeenCalled();
  });

  it('calls onComplete when lottie errors with no mappable effects', () => {
    const onComplete = vi.fn();
    render(
      <OasAnimationWrapper
        config={{
          backend: 'lottie',
          src: 'assets/rewards/missing.lottie',
        }}
        onComplete={onComplete}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('mock-error'));
    expect(screen.getByTestId('css-animation-renderer')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalled();
  });
});
