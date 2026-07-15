import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SvgExplorer } from './SvgExplorer.js';

const MOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><path id="odisha" d="M10 10L100 10L100 100L10 100Z"/><path id="karnataka" d="M150 150L250 150L250 250L150 250Z"/></svg>`;

const REGIONS = [
  { id: 'odisha', name: 'Odisha', description: 'Eastern state' },
  { id: 'karnataka', name: 'Karnataka', description: 'Southern state' },
];

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
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
    );

    render(<SvgExplorer src="https://example.com/map.svg" regions={REGIONS} onEvent={() => {}} />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('group', { name: 'SVG Explorer' })).toBeInTheDocument();
  });

  it('emits region:select event on click', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
    );

    const onEvent = vi.fn();

    render(<SvgExplorer src="https://example.com/map.svg" regions={REGIONS} onEvent={onEvent} />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const regionButton = screen.getByRole('button', { name: 'Odisha' });
    fireEvent.click(regionButton);

    expect(onEvent).toHaveBeenCalledWith({ type: 'region:select', regionId: 'odisha' });
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
});
