import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStudioApi } from './studioApi';

describe('studioApi client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getOutline parses JSON response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ activities: [], title: 'Fractions' }), {
        status: 200,
      }),
    );
    const api = createStudioApi();
    const result = await api.getOutline();
    expect(fetchMock).toHaveBeenCalledWith('/api/package/outline', expect.any(Object));
    expect(result).toEqual({ activities: [], title: 'Fractions' });
  });

  it('saveOutlineOrder posts orderedPaths', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const api = createStudioApi();
    await api.saveOutlineOrder(['nodes/a.md', 'nodes/b.json']);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/package/outline');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({ orderedPaths: ['nodes/a.md', 'nodes/b.json'] });
  });

  it('exportOep returns blob and filename from Content-Disposition', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Blob(['oep-bytes']), {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="fractions-1.0.0.oep"' },
      }),
    );
    const api = createStudioApi();
    const result = await api.exportOep();
    expect(result.fileName).toBe('fractions-1.0.0.oep');
    expect(result.blob.size).toBe(13);
  });

  it('exportOep falls back to course.oep when header is missing', async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Blob(['oep-bytes']), { status: 200 }));
    const api = createStudioApi();
    const result = await api.exportOep();
    expect(result.fileName).toBe('course.oep');
  });

  it('throws a descriptive error on non-ok responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Export failed' }), { status: 400 }),
    );
    const api = createStudioApi();
    await expect(api.exportOep()).rejects.toThrow('Export failed');
  });
});
