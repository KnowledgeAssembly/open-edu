import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SvgExplorer } from './SvgExplorer.js';

const MOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><path id="odisha" d="M10 10L100 10L100 100L10 100Z"/><path id="karnataka" d="M150 150L250 150L250 250L150 250Z"/></svg>`;

const REGIONS = [
  { id: 'odisha', name: 'Odisha', description: 'Eastern state' },
  { id: 'karnataka', name: 'Karnataka', description: 'Southern state' },
];

async function renderAndWait(src = 'https://example.com/map.svg') {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
  );
  const onEvent = vi.fn();
  const result = render(<SvgExplorer src={src} regions={REGIONS} onEvent={onEvent} />);
  await waitFor(() => {
    expect(screen.queryByRole('status', { name: 'Loading SVG' })).not.toBeInTheDocument();
  });
  return { onEvent, ...result };
}

describe('SvgExplorer', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
    );

    render(<SvgExplorer src="https://example.com/map.svg" regions={REGIONS} onEvent={() => {}} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders regions after loading', async () => {
    await renderAndWait();

    expect(screen.getByRole('group', { name: 'SVG Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odisha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Karnataka' })).toBeInTheDocument();
  });

  it('emits region:select event on click', async () => {
    const { onEvent } = await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: 'Odisha' }));

    expect(onEvent).toHaveBeenCalledWith({ type: 'region:select', regionId: 'odisha' });
  });

  it('emits only one region:select event on keyboard selection', async () => {
    const { onEvent } = await renderAndWait();

    const region = screen.getByRole('button', { name: 'Odisha' });
    fireEvent.keyDown(region, { key: 'Enter' });

    const selectEvents = onEvent.mock.calls.filter(
      ([e]) => e.type === 'region:select' && e.regionId === 'odisha',
    );
    expect(selectEvents).toHaveLength(1);
  });

  it('renders error state on fetch failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404, statusText: 'Not Found' }),
    );

    render(<SvgExplorer src="https://example.com/map.svg" regions={REGIONS} onEvent={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('zoom controls', () => {
    it('shows zoom controls when zoom is enabled', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
      );

      render(
        <SvgExplorer
          src="https://example.com/map.svg"
          regions={REGIONS}
          onEvent={() => {}}
          zoom={{ enabled: true }}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: 'Loading SVG' })).not.toBeInTheDocument();
      });

      expect(screen.getByRole('toolbar', { name: 'Zoom controls' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeInTheDocument();
    });

    it('does not show zoom controls by default', async () => {
      await renderAndWait();
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('emits zoom:change on zoom in', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
      );

      const onEvent = vi.fn();
      render(
        <SvgExplorer
          src="https://example.com/map.svg"
          regions={REGIONS}
          onEvent={onEvent}
          zoom={{ enabled: true }}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: 'Loading SVG' })).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'zoom:change' }));
    });
  });

  describe('keyboard navigation', () => {
    it('moves focus with ArrowRight', async () => {
      await renderAndWait();

      const odisha = screen.getByRole('button', { name: 'Odisha' });
      act(() => {
        fireEvent.click(odisha);
        fireEvent.focusIn(odisha);
      });

      fireEvent.keyDown(odisha, { key: 'ArrowRight' });

      expect(screen.getByRole('button', { name: 'Karnataka' })).toHaveClass('oe-svg-region--focus');
    });

    it('wraps focus with ArrowRight at end', async () => {
      await renderAndWait();

      const karnataka = screen.getByRole('button', { name: 'Karnataka' });
      act(() => {
        fireEvent.click(karnataka);
        fireEvent.focusIn(karnataka);
      });

      fireEvent.keyDown(karnataka, { key: 'ArrowRight' });

      expect(screen.getByRole('button', { name: 'Odisha' })).toHaveClass('oe-svg-region--focus');
    });

    it('moves focus with Tab', async () => {
      await renderAndWait();

      const odisha = screen.getByRole('button', { name: 'Odisha' });
      act(() => {
        fireEvent.click(odisha);
        fireEvent.focusIn(odisha);
      });

      fireEvent.keyDown(odisha, { key: 'Tab' });

      expect(screen.getByRole('button', { name: 'Karnataka' })).toHaveClass('oe-svg-region--focus');
    });

    it('moves focus backward with Shift+Tab', async () => {
      await renderAndWait();

      const karnataka = screen.getByRole('button', { name: 'Karnataka' });
      act(() => {
        fireEvent.click(karnataka);
        fireEvent.focusIn(karnataka);
      });

      fireEvent.keyDown(karnataka, { key: 'Tab', shiftKey: true });

      expect(screen.getByRole('button', { name: 'Odisha' })).toHaveClass('oe-svg-region--focus');
    });

    it('selects focused region on Enter', async () => {
      const { onEvent } = await renderAndWait();

      const odisha = screen.getByRole('button', { name: 'Odisha' });
      act(() => {
        fireEvent.click(odisha);
        fireEvent.focusIn(odisha);
      });

      fireEvent.keyDown(odisha, { key: 'Enter' });

      expect(onEvent).toHaveBeenCalledWith({ type: 'region:select', regionId: 'odisha' });
    });

    it('selects focused region on Space', async () => {
      const { onEvent } = await renderAndWait();

      const odisha = screen.getByRole('button', { name: 'Odisha' });
      act(() => {
        fireEvent.click(odisha);
        fireEvent.focusIn(odisha);
      });

      fireEvent.keyDown(odisha, { key: ' ' });

      expect(onEvent).toHaveBeenCalledWith({ type: 'region:select', regionId: 'odisha' });
    });

    it('clears selection on Escape', async () => {
      const { onEvent } = await renderAndWait();

      fireEvent.click(screen.getByRole('button', { name: 'Odisha' }));
      expect(onEvent).toHaveBeenCalledWith({ type: 'region:select', regionId: 'odisha' });

      fireEvent.keyDown(screen.getByRole('group', { name: 'SVG Explorer' }), { key: 'Escape' });
      expect(onEvent).toHaveBeenCalledWith({ type: 'region:focus', regionId: null });
    });
  });

  describe('selection modes', () => {
    it('allows multi-select in multi mode', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
      );

      const onEvent = vi.fn();
      render(
        <SvgExplorer
          src="https://example.com/map.svg"
          regions={REGIONS}
          onEvent={onEvent}
          selection="multi"
        />,
      );

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: 'Loading SVG' })).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Odisha' }));
      fireEvent.click(screen.getByRole('button', { name: 'Karnataka' }));

      const selectEvents = onEvent.mock.calls.filter(([e]) => e.type === 'region:select');
      expect(selectEvents).toHaveLength(2);
    });

    it('does not allow selection in none mode', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
      );

      const onEvent = vi.fn();
      render(
        <SvgExplorer
          src="https://example.com/map.svg"
          regions={REGIONS}
          onEvent={onEvent}
          selection="none"
        />,
      );

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: 'Loading SVG' })).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('img', { name: 'Odisha' }));

      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has role="group" with aria-label', async () => {
      await renderAndWait();
      const group = screen.getByRole('group', { name: 'SVG Explorer' });
      expect(group).toBeInTheDocument();
      expect(group).toHaveAttribute('tabindex', '-1');
    });

    it('has role="img" when selection is none', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
      );

      render(
        <SvgExplorer
          src="https://example.com/map.svg"
          regions={REGIONS}
          onEvent={() => {}}
          selection="none"
        />,
      );

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: 'Loading SVG' })).not.toBeInTheDocument();
      });

      expect(screen.getByRole('img', { name: 'Interactive map' })).toBeInTheDocument();
    });

    it('has live region for announcements', async () => {
      await renderAndWait();

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Odisha' }));

      const liveRegion = screen
        .getAllByRole('status')
        .find((el) => el.getAttribute('aria-live') === 'polite');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toContain('Selected');
    });

    it('applies className prop', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
      );

      render(
        <SvgExplorer
          src="https://example.com/map.svg"
          regions={REGIONS}
          onEvent={() => {}}
          className="custom-class"
        />,
      );

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: 'Loading SVG' })).not.toBeInTheDocument();
      });

      const group = screen.getByRole('group', { name: 'SVG Explorer' });
      expect(group.className).toContain('custom-class');
    });
  });

  describe('inline SVG', () => {
    it('loads inline SVG string', async () => {
      const inlineSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><path id="region1" d="M10 10L100 10L100 100L10 100Z"/></svg>`;
      const inlineRegions = [{ id: 'region1', name: 'Region 1' }];

      render(<SvgExplorer src={inlineSvg} regions={inlineRegions} onEvent={() => {}} />);

      await waitFor(() => {
        expect(screen.queryByRole('status', { name: 'Loading SVG' })).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Region 1' })).toBeInTheDocument();
    });
  });
});
