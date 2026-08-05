import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { SvgStepRenderer } from '../SvgStepRenderer.js';

const SAMPLE_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g id="evaporation" data-step="1"><circle cx="20" cy="20" r="10" fill="orange"/></g>
  <g id="condensation" data-step="2"><circle cx="50" cy="30" r="12" fill="white"/></g>
  <g id="precipitation" data-step="3"><circle cx="50" cy="70" r="4" fill="blue"/></g>
</svg>`;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

describe('SvgStepRenderer', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => SAMPLE_SVG,
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads SVG and hides step layers when currentStep is -1', async () => {
    render(
      <SvgStepRenderer
        src="assets/water.svg"
        currentStep={-1}
        effects={[
          { step: 1, target: 'evaporation', effect: 'fade' },
          { step: 2, target: 'condensation', effect: 'pulse' },
          { step: 3, target: 'precipitation', effect: 'fade' },
        ]}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId('oas-svg-step-host')).toBeInTheDocument();
    });

    const host = screen.getByTestId('oas-svg-step-host');
    expect(host.getAttribute('data-oas-step')).toBe('-1');
    const evap = host.querySelector('#evaporation') as SVGElement;
    expect(evap.getAttribute('data-oas-revealed')).toBe('false');
    expect(evap.style.opacity).toBe('0');
  });

  it('reveals layers up to the current step', async () => {
    const { rerender } = render(
      <SvgStepRenderer
        src="assets/water.svg"
        currentStep={0}
        effects={[
          { step: 1, target: 'evaporation', effect: 'fade' },
          { step: 2, target: 'condensation', effect: 'pulse' },
          { step: 3, target: 'precipitation', effect: 'fade' },
        ]}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId('oas-svg-step-host')).toBeInTheDocument();
    });

    let host = screen.getByTestId('oas-svg-step-host');
    expect((host.querySelector('#evaporation') as SVGElement).style.opacity).toBe('1');
    expect((host.querySelector('#condensation') as SVGElement).style.opacity).toBe('0');

    rerender(
      <SvgStepRenderer
        src="assets/water.svg"
        currentStep={1}
        effects={[
          { step: 1, target: 'evaporation', effect: 'fade' },
          { step: 2, target: 'condensation', effect: 'pulse' },
          { step: 3, target: 'precipitation', effect: 'fade' },
        ]}
      />,
    );

    host = screen.getByTestId('oas-svg-step-host');
    expect((host.querySelector('#evaporation') as SVGElement).style.opacity).toBe('1');
    expect((host.querySelector('#condensation') as SVGElement).style.opacity).toBe('1');
    expect((host.querySelector('#precipitation') as SVGElement).style.opacity).toBe('0');
  });

  it('accepts inline SVG src without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <SvgStepRenderer src={SAMPLE_SVG} currentStep={0} effects={[{ target: 'evaporation', effect: 'fade', step: 1 }]} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId('oas-svg-step-host')).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
