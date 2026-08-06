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
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const api = createStudioApi();
    await api.saveOutlineOrder(['nodes/a.md', 'nodes/b.json']);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/package/outline');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({
      orderedPaths: ['nodes/a.md', 'nodes/b.json'],
    });
  });

  it('applyTemplate sends force overwrite so it works on existing packages', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const api = createStudioApi();
    await api.applyTemplate('reading-lesson');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/package/create-from-template');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      templateId: 'reading-lesson',
      force: true,
    });
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

  it('getAiStatus hits the studio AI status endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true }), { status: 200 }),
    );
    const api = createStudioApi();
    const result = await api.getAiStatus();
    expect(fetchMock).toHaveBeenCalledWith('/api/studio/ai/status', expect.any(Object));
    expect(result).toEqual({ available: true });
  });

  it('generateFromNotes posts notes to the AI generate endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, quality: [], outlinePreview: [], title: 'Fractions' }),
        { status: 200 },
      ),
    );
    const api = createStudioApi();
    const result = await api.generateFromNotes('Teach fractions', true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/ai/generate');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ notes: 'Teach fractions', force: true });
    expect(result.success).toBe(true);
  });

  it('generateFromNotes omits force when not supplied', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, quality: [], outlinePreview: [], title: 'Fractions' }),
        { status: 200 },
      ),
    );
    const api = createStudioApi();
    await api.generateFromNotes('Teach fractions');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/ai/generate');
    expect(JSON.parse(init?.body as string)).toEqual({ notes: 'Teach fractions' });
  });

  it('getLibrary hits the library root and returns workspace + entries', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ workspace: '/ws', entries: [{ id: 'fractions', title: 'Fractions' }] }),
        { status: 200 },
      ),
    );
    const api = createStudioApi();
    const result = await api.getLibrary();
    expect(fetchMock).toHaveBeenCalledWith('/api/studio/library', expect.any(Object));
    expect(result.entries[0]?.id).toBe('fractions');
  });

  it('openLibraryCourse posts relativePath to /open', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, packageDir: '/ws/fractions' }), {
        status: 200,
      }),
    );
    const api = createStudioApi();
    const result = await api.openLibraryCourse('fractions');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/library/open');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ relativePath: 'fractions' });
    expect(result.packageDir).toBe('/ws/fractions');
  });

  it('duplicateCourse posts relativePath + new ids to /duplicate', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, entry: { id: 'fractions-copy', title: 'Fractions 2' } }),
        { status: 200 },
      ),
    );
    const api = createStudioApi();
    await api.duplicateCourse('fractions', 'fractions-copy', 'Fractions 2');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/library/duplicate');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      relativePath: 'fractions',
      newId: 'fractions-copy',
      newTitle: 'Fractions 2',
    });
  });

  it('renameCourse posts relativePath + newTitle to /rename', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, entry: { id: 'fractions', title: 'Fractions' } }), {
        status: 200,
      }),
    );
    const api = createStudioApi();
    await api.renameCourse('fractions', 'Fractions Basics');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/library/rename');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      relativePath: 'fractions',
      newTitle: 'Fractions Basics',
    });
  });

  it('archiveCourse posts relativePath to /archive', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, archivedPath: '/ws/.archive/fractions' }), {
        status: 200,
      }),
    );
    const api = createStudioApi();
    const result = await api.archiveCourse('fractions');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/library/archive');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ relativePath: 'fractions' });
    expect(result.archivedPath).toContain('.archive');
  });

  it('importCourseFolder posts sourcePath to /import', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, entry: { id: 'imported', title: 'Imported' } }), {
        status: 200,
      }),
    );
    const api = createStudioApi();
    await api.importCourseFolder('/some/absolute/path');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/library/import');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ sourcePath: '/some/absolute/path' });
  });

  it('createUnit posts title + courseRelativePaths to /create-unit', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, entry: { id: 'unit', title: 'My Unit', kind: 'unit' } }),
        { status: 200 },
      ),
    );
    const api = createStudioApi();
    await api.createUnit('My Unit', ['fractions', 'living-vs-nonliving']);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/library/create-unit');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      title: 'My Unit',
      courseRelativePaths: ['fractions', 'living-vs-nonliving'],
    });
  });

  it('exportUnitOep returns blob and filename parsed from Content-Disposition', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Blob(['oep-bytes']), {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="my-unit-1.0.0.oep"' },
      }),
    );
    const api = createStudioApi();
    const result = await api.exportUnitOep('units/my-unit');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/library/export-unit-oep');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ relativePath: 'units/my-unit' });
    expect(result.fileName).toBe('my-unit-1.0.0.oep');
    expect(result.blob.size).toBe(13);
  });

  it('exportUnitOep falls back to unit.oep when header is missing', async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Blob(['oep-bytes']), { status: 200 }));
    const api = createStudioApi();
    const result = await api.exportUnitOep('units/my-unit');
    expect(result.fileName).toBe('unit.oep');
  });

  it('exportUnitOep throws on non-ok responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bundle.json not found' }), { status: 400 }),
    );
    const api = createStudioApi();
    await expect(api.exportUnitOep('units/missing')).rejects.toThrow('bundle.json not found');
  });
});
