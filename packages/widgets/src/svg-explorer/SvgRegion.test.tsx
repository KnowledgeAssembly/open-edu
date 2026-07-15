import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SvgRegion as SvgRegionData } from './types.js';
import { SvgRegion } from './SvgRegion.js';

function makeRegion(id: string): SvgRegionData {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('id', id);
  el.setAttribute('d', 'M10 10L100 10L100 100L10 100Z');
  return {
    id,
    element: el,
    bbox: new DOMRect(10, 10, 90, 90),
    visible: true,
  } as SvgRegionData;
}

describe('SvgRegion', () => {
  it('renders with base class oe-svg-region', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    expect(screen.getByRole('button')).toHaveClass('oe-svg-region');
  });

  it('adds oe-svg-region--selected class when selected', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={true}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    expect(screen.getByRole('button')).toHaveClass('oe-svg-region--selected');
  });

  it('adds oe-svg-region--hover class when hovered', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={true}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    expect(screen.getByRole('button')).toHaveClass('oe-svg-region--hover');
  });

  it('adds oe-svg-region--focus class when focused', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={true}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    expect(screen.getByRole('button')).toHaveClass('oe-svg-region--focus');
  });

  it('adds oe-svg-region--disabled class when disabled', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
          disabled={true}
        />
      </svg>,
    );

    expect(screen.getByRole('button')).toHaveClass('oe-svg-region--disabled');
  });

  it('has role="button" when interactive', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    expect(screen.getByRole('button', { name: 'Region 1' })).toBeInTheDocument();
  });

  it('has role="img" when not interactive', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={false}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    expect(screen.getByRole('img', { name: 'Region 1' })).toBeInTheDocument();
  });

  it('has aria-pressed when interactive and selected', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={true}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelect on click', () => {
    const onSelect = vi.fn();
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={onSelect}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('r1');
  });

  it('does not call onSelect on click when disabled', () => {
    const onSelect = vi.fn();
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={onSelect}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
          disabled={true}
        />
      </svg>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onSelect on Enter', () => {
    const onSelect = vi.fn();
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={onSelect}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('r1');
  });

  it('calls onHover on mouse enter', () => {
    const onHover = vi.fn();
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={onHover}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(onHover).toHaveBeenCalledWith('r1');
  });

  it('calls onHover(null) on mouse leave', () => {
    const onHover = vi.fn();
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={onHover}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    fireEvent.mouseLeave(screen.getByRole('button'));
    expect(onHover).toHaveBeenCalledWith(null);
  });

  it('uses standard --oe-color-primary token for selected fill', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={true}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    const el = screen.getByRole('button');
    expect(el).toHaveStyle({ fill: 'var(--oe-color-primary)' });
  });

  it('uses transparent fill for default state', () => {
    const region = makeRegion('r1');
    render(
      <svg>
        <SvgRegion
          region={region}
          selected={false}
          focused={false}
          hovered={false}
          interactive={true}
          onSelect={() => {}}
          onHover={() => {}}
          onFocus={() => {}}
          ariaLabel="Region 1"
        />
      </svg>,
    );

    const el = screen.getByRole('button');
    expect(el).toHaveStyle({ fill: 'transparent' });
  });
});
