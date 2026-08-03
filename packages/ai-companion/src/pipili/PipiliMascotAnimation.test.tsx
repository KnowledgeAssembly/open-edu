import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { PipiliMascotAnimation } from './PipiliMascotAnimation.js';

vi.mock('@open-edu/runtime', () => ({
  OasAnimationWrapper: ({ config }: { config: { src?: string } }) => (
    <div data-testid="oas-wrapper">{config?.src ?? 'no-src'}</div>
  ),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { learner: learnerDict, runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

describe('PipiliMascotAnimation', () => {
  it('renders the OAS wrapper with the state-specific binding', () => {
    render(<PipiliMascotAnimation state="thinking" />, { wrapper });
    expect(screen.getByTestId('oas-wrapper')).toBeInTheDocument();
    expect(screen.getByText('assets/pipili/pipili-thinking.lottie')).toBeInTheDocument();
  });

  it('falls back to the default binding when no state matches', () => {
    const bindings = {
      bindings: [{ state: 'idle' as const, animation: { backend: 'lottie' as const } }],
      fallback: { backend: 'lottie' as const, src: 'assets/pipili/fallback.lottie' },
    };
    render(<PipiliMascotAnimation state="hinting" bindings={bindings} />, { wrapper });
    expect(screen.getByText('assets/pipili/fallback.lottie')).toBeInTheDocument();
  });

  it('renders a static pose under OS reduced motion', () => {
    document.documentElement.style.setProperty('--oe-reduced-motion', 'reduce');

    render(<PipiliMascotAnimation state="idle" />, { wrapper });
    expect(screen.queryByTestId('oas-wrapper')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();

    document.documentElement.style.removeProperty('--oe-reduced-motion');
  });

  it('respects the reducedMotion override', () => {
    render(<PipiliMascotAnimation state="thinking" reducedMotion />, { wrapper });
    expect(screen.queryByTestId('oas-wrapper')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('does not throw for an unknown state with empty bindings', () => {
    expect(() =>
      render(<PipiliMascotAnimation state="idle" bindings={{ bindings: [] }} />, { wrapper }),
    ).not.toThrow();
  });
});
