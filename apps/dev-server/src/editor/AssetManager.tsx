import { useState, useRef, useCallback } from 'react';
import { uploadAsset, deleteFile } from './api';

interface AssetManagerProps {
  assets: string[];
  onRefresh: () => void;
}

const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.avif']);

export function AssetManager({ assets, onRefresh }: AssetManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        await uploadAsset(file);
        onRefresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onRefresh],
  );

  const handleDelete = useCallback(
    async (assetPath: string) => {
      if (!window.confirm(`Delete "${assetPath}"?`)) return;
      try {
        await deleteFile(assetPath);
        onRefresh();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [onRefresh],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        await uploadAsset(file);
        onRefresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [onRefresh],
  );

  if (assets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-700">
          Upload images and other assets for your package.
        </div>
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-8 hover:border-blue-300"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg
            className="mb-2 h-8 w-8 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-gray-500">Drop files here or click to upload</p>
          <p className="text-xs text-gray-400">Images, PDFs, videos, and other assets</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          aria-label="Upload asset file"
        />
        {uploading && <p className="text-xs text-blue-600">Uploading...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-700">
        {assets.length} asset{assets.length !== 1 ? 's' : ''} in your package.
      </div>

      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 hover:border-blue-300"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="text-xs text-gray-500">Drop files or click to upload</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        aria-label="Upload asset file"
      />
      {uploading && <p className="text-xs text-blue-600">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        {assets.map((assetPath) => {
          const fileName = assetPath.split('/').pop() ?? assetPath;
          const ext = '.' + (fileName.split('.').pop() ?? '').toLowerCase();
          const isImage = imageExts.has(ext);

          return (
            <div
              key={assetPath}
              className="group relative rounded-lg border border-gray-200 bg-white p-2"
            >
              {isImage ? (
                <div className="mb-1 flex aspect-square items-center justify-center overflow-hidden rounded bg-gray-50">
                  <img
                    src={`/assets/${assetPath.replace(/^assets\//, '')}`}
                    alt={fileName}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<span class="text-2xl text-gray-300">?</span>';
                    }}
                  />
                </div>
              ) : (
                <div className="mb-1 flex aspect-square items-center justify-center rounded bg-gray-50">
                  <span className="text-2xl text-gray-300">
                    {ext === '.pdf' ? 'PDF' : ext === '.mp4' ? 'VID' : 'FILE'}
                  </span>
                </div>
              )}
              <p className="truncate text-[10px] text-gray-600" title={assetPath}>
                {fileName}
              </p>
              <button
                type="button"
                className="absolute right-1 top-1 rounded bg-red-500 px-1 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(assetPath);
                }}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
