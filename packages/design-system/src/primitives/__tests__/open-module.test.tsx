import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpenModule, progressToSatellites } from '../open-module';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('progressToSatellites', () => {
  it('returns 2 for progress 0', () => {
    expect(progressToSatellites(0)).toBe(2);
  });

  it('returns 3 for progress 1-33', () => {
    expect(progressToSatellites(1)).toBe(3);
    expect(progressToSatellites(33)).toBe(3);
  });

  it('returns 4 for progress 34-66', () => {
    expect(progressToSatellites(34)).toBe(4);
    expect(progressToSatellites(50)).toBe(4);
    expect(progressToSatellites(66)).toBe(4);
  });

  it('returns 5 for progress 67-99', () => {
    expect(progressToSatellites(67)).toBe(5);
    expect(progressToSatellites(99)).toBe(5);
  });

  it('returns 6 for progress 100', () => {
    expect(progressToSatellites(100)).toBe(6);
  });

  it('clamps negative values to 0', () => {
    expect(progressToSatellites(-1)).toBe(2);
  });

  it('clamps values above 100 to 100', () => {
    expect(progressToSatellites(150)).toBe(6);
  });
});

describe('OpenModule', () => {
  it('renders with default size and satellites', () => {
    render(<OpenModule data-testid="module" />);
    const el = screen.getByTestId('module');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders with sm size', () => {
    render(<OpenModule size="sm" satellites={2} data-testid="module" />);
    const el = screen.getByTestId('module');
    const svg = el.querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
  });

  it('renders with lg size and 6 satellites', () => {
    render(<OpenModule size="lg" satellites={6} data-testid="module" />);
    const el = screen.getByTestId('module');
    const circles = el.querySelectorAll('svg > circle');
    // 1 orbit + 6 satellites + 1 core = 8 circles
    expect(circles.length).toBe(8);
  });

  it('clamps satellites to 2 minimum', () => {
    render(<OpenModule satellites={0} data-testid="module" />);
    const el = screen.getByTestId('module');
    const satellites = el.querySelectorAll('svg > circle');
    // Removing orbit, ring, and core: 1 orbit + 2 sats + 1 core = 4
    expect(satellites.length).toBe(4);
  });

  it('renders active state with ring', () => {
    render(<OpenModule state="active" data-testid="module" />);
    const el = screen.getByTestId('module');
    const circles = el.querySelectorAll('svg > circle');
    // 1 orbit + 3 sats + 1 ring + 1 core = 6
    expect(circles.length).toBe(6);
  });

  it('applies custom className', () => {
    render(<OpenModule className="inline-block" data-testid="module" />);
    expect(screen.getByTestId('module')).toHaveClass('inline-block');
  });

  it('accepts progress prop and maps to satellites', () => {
    render(<OpenModule progress={0} data-testid="module-progress-0" />);
    const el0 = screen.getByTestId('module-progress-0');
    const sats0 = el0.querySelectorAll('svg > circle');
    // 1 orbit + 2 sats + 1 core = 4
    expect(sats0.length).toBe(4);

    render(<OpenModule progress={50} data-testid="module-progress-50" />);
    const el50 = screen.getByTestId('module-progress-50');
    const sats50 = el50.querySelectorAll('svg > circle');
    // 1 orbit + 4 sats + 1 core = 6
    expect(sats50.length).toBe(6);

    render(<OpenModule progress={100} data-testid="module-progress-100" />);
    const el100 = screen.getByTestId('module-progress-100');
    const sats100 = el100.querySelectorAll('svg > circle');
    // 1 orbit + 6 sats + 1 core = 8
    expect(sats100.length).toBe(8);
  });

  it('satellites prop overrides progress prop', () => {
    render(<OpenModule satellites={5} progress={100} data-testid="module-override" />);
    const el = screen.getByTestId('module-override');
    const sats = el.querySelectorAll('svg > circle');
    // 1 orbit + 5 sats + 1 core = 7
    expect(sats.length).toBe(7);
  });

  describe('accessibility', () => {
    it('has no violations with default props', async () => {
      await checkAccessibility(<OpenModule />);
    });

    it('has no violations at sm size', async () => {
      await checkAccessibility(<OpenModule size="sm" satellites={2} />);
    });

    it('has no violations at lg size', async () => {
      await checkAccessibility(<OpenModule size="lg" satellites={6} />);
    });

    it('has no violations with active state', async () => {
      await checkAccessibility(<OpenModule state="active" />);
    });
  });
});
