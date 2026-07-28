import { useState, useRef, useCallback } from 'react';
import { uploadAsset, deleteFile } from './api';
import { Upload } from 'lucide-react';

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
        <div className="border-tertiary-container bg-tertiary-container text-tertiary rounded-lg border px-3 py-2 text-xs">
          Upload images and other assets for your package.
        </div>
        <div
          className="border-outline-variant hover:border-primary flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="text-on-surface-variant mb-2 h-8 w-8" />
          <p className="text-on-surface-variant text-sm">Drop files here or click to upload</p>
          <p className="text-on-surface-variant text-xs">Images, PDFs, videos, and other assets</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          aria-label="Upload asset file"
        />
        {uploading && <p className="text-primary text-xs">Uploading...</p>}
        {error && <p className="text-error text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-tertiary-container bg-tertiary-container text-tertiary rounded-lg border px-3 py-2 text-xs">
        {assets.length} asset{assets.length !== 1 ? 's' : ''} in your package.
      </div>

      <div
        className="border-outline-variant hover:border-primary flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="text-on-surface-variant text-xs">Drop files or click to upload</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        aria-label="Upload asset file"
      />
      {uploading && <p className="text-primary text-xs">Uploading...</p>}
      {error && <p className="text-error text-xs">{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        {assets.map((assetPath) => {
          const fileName = assetPath.split('/').pop() ?? assetPath;
          const ext = '.' + (fileName.split('.').pop() ?? '').toLowerCase();
          const isImage = imageExts.has(ext);

          return (
            <div
              key={assetPath}
              className="border-outline-variant bg-surface group relative rounded-lg border p-2"
            >
              {isImage ? (
                <div className="bg-surface-container-low mb-1 flex aspect-square items-center justify-center overflow-hidden rounded">
                  <img
                    src={`/assets/${assetPath.replace(/^assets\//, '')}`}
                    alt={fileName}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<span class="text-2xl text-on-surface-variant">?</span>';
                    }}
                  />
                </div>
              ) : (
                <div className="bg-surface-container-low mb-1 flex aspect-square items-center justify-center rounded">
                  <span className="text-on-surface-variant text-2xl">
                    {ext === '.pdf' ? 'PDF' : ext === '.mp4' ? 'VID' : 'FILE'}
                  </span>
                </div>
              )}
              <p className="text-on-surface-variant truncate text-[10px]" title={assetPath}>
                {fileName}
              </p>
              <button
                type="button"
                className="bg-destructive absolute right-1 top-1 rounded px-1 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
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
