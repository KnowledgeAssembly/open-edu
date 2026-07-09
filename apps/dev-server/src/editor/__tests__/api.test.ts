import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listFiles,
  readFile,
  writeFile,
  createFile,
  deleteFile,
  uploadAsset,
  getPackageDir,
  validatePackage,
} from '../api';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function mockResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('api client', () => {
  it('listFiles fetches /api/package/tree', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        files: [{ path: 'test.json', label: 'Test', category: 'nodes', extension: '.json' }],
      }),
    );
    const result = await listFiles();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/package/tree',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(result).toEqual([
      { path: 'test.json', label: 'Test', category: 'nodes', extension: '.json' },
    ]);
  });

  it('readFile fetches /api/package/file with path param', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ path: 'test.json', content: '{}', isEditable: true, extension: '.json' }),
    );
    const result = await readFile('test.json');
    expect(mockFetch).toHaveBeenCalledWith('/api/package/file?path=test.json', expect.any(Object));
    expect(result).toEqual({
      path: 'test.json',
      content: '{}',
      isEditable: true,
      extension: '.json',
    });
  });

  it('readFile encodes path parameter', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        path: 'nodes/test.json',
        content: '{}',
        isEditable: true,
        extension: '.json',
      }),
    );
    await readFile('nodes/test.json');
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain(encodeURIComponent('nodes/test.json'));
  });

  it('writeFile sends PUT to /api/package/file', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ success: true, path: 'test.json' }));
    const result = await writeFile('test.json', '{"key":"val"}', true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/package/file',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ path: 'test.json', content: '{"key":"val"}', validate: true }),
      }),
    );
    expect(result).toEqual({ success: true, path: 'test.json' });
  });

  it('createFile sends POST to /api/package/file', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ success: true, path: 'nodes/new.md' }));
    const result = await createFile('nodes/new.md', '# Hello', false);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/package/file',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: 'nodes/new.md', content: '# Hello', validate: false }),
      }),
    );
    expect(result).toEqual({ success: true, path: 'nodes/new.md' });
  });

  it('deleteFile sends DELETE to /api/package/file', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ success: true }));
    const result = await deleteFile('test.json');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/package/file?path=test.json',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it('getPackageDir fetches /api/package/dir', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ packageDir: '/test/package' }));
    const result = await getPackageDir();
    expect(mockFetch).toHaveBeenCalledWith('/api/package/dir', expect.any(Object));
    expect(result).toBe('/test/package');
  });

  it('validatePackage posts to /api/package/validate', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ valid: true, errors: [] }));
    const result = await validatePackage();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/package/validate',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('uploadAsset sends multipart form data', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ success: true, path: 'assets/img.png' }));
    const file = new File(['test'], 'img.png', { type: 'image/png' });
    await uploadAsset(file);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/package/assets/upload',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Not found' }, false, 404));
    await expect(readFile('missing.json')).rejects.toThrow('Not found');
  });
});
