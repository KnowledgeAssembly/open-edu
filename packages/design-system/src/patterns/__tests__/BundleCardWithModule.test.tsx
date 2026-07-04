import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BundleCardWithModule, getBundleSatellites } from '../BundleCardWithModule';

describe('getBundleSatellites', () => {
  it('returns 2 when not started (0/5)', () => {
    expect(getBundleSatellites(0, 5)).toBe(2);
  });

  it('returns 6 when complete (5/5)', () => {
    expect(getBundleSatellites(5, 5)).toBe(6);
  });

  it('returns 4 when in progress (2/5)', () => {
    expect(getBundleSatellites(2, 5)).toBe(4);
  });

  it('returns 2 when totalModules is 0', () => {
    expect(getBundleSatellites(0, 0)).toBe(2);
  });

  it('returns 5 when near completion (4/5)', () => {
    expect(getBundleSatellites(4, 5)).toBe(5);
  });
});

describe('BundleCardWithModule', () => {
  it('renders OpenModule with aria-hidden="true"', () => {
    const { container } = render(
      <BundleCardWithModule completedModules={1} totalModules={5}>
        <div>Child</div>
      </BundleCardWithModule>,
    );
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <BundleCardWithModule completedModules={0} totalModules={5}>
        <div data-testid="child">Bundle content</div>
      </BundleCardWithModule>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
