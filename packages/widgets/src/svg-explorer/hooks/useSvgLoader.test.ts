import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSvgLoader } from './useSvgLoader.js';

const MOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <path id="region1" d="M10 10L100 10L100 100L10 100Z"/>
  <path id="region2" d="M150 150L250 150L250 250L150 250Z"/>
  <rect id="background" x="0" y="0" width="600" height="400" fill="#eee"/>
</svg>`;

describe('useSvgLoader', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads SVG from URL and parses regions', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(MOCK_SVG, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }),
    );

    const { result } = renderHook(() =>
      useSvgLoader({ src: 'https://example.com/map.svg', regionIds: ['region1', 'region2'] }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.regions.size).toBe(2);
    expect(result.current.regions.has('region1')).toBe(true);
    expect(result.current.regions.has('region2')).toBe(true);
    expect(result.current.viewBox).toEqual({ x: 0, y: 0, width: 600, height: 400 });
    expect(result.current.svgElement).not.toBeNull();
  });

  it('loads SVG from inline string', async () => {
    const { result } = renderHook(() =>
      useSvgLoader({ src: MOCK_SVG, regionIds: ['region1'] }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.regions.size).toBe(1);
    expect(result.current.regions.has('region1')).toBe(true);
    expect(result.current.viewBox).toEqual({ x: 0, y: 0, width: 600, height: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sets error on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useSvgLoader({ src: 'https://example.com/map.svg', regionIds: ['region1'] }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.regions.size).toBe(0);
  });

  it('sets error on invalid SVG content', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('not valid svg', { status: 200 }),
    );

    const { result } = renderHook(() =>
      useSvgLoader({ src: 'https://example.com/map.svg', regionIds: ['region1'] }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.regions.size).toBe(0);
  });
});
