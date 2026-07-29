import { useMemo, useState, useCallback, useEffect } from 'react';
import type { FileEntry, ContextMenuTarget } from './types';
import { FileJson, FileText, FileImage, File, Upload, Plus } from 'lucide-react';
import { cn } from '@open-edu/design-system';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

interface FileTreeProps {
  files: FileEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onContextMenu?: (target: ContextMenuTarget) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
  onNewNode?: () => void;
  onUploadAsset?: () => void;
  onCreateFile?: (section: string) => void;
  externalRenameTarget?: FileEntry | null;
  onExternalRenameHandled?: () => void;
  externalDeleteTarget?: FileEntry | null;
  onExternalDeleteHandled?: () => void;
}

const categoryLabels: Record<string, string> = {
  manifest: 'Manifest',
  workflow: 'Workflow',
  rewards: 'Rewards',
  cards: 'Cards',
  nodes: 'Content Nodes',
  assets: 'Assets',
  other: 'Other Files',
};

const categoryOrder = ['manifest', 'workflow', 'rewards', 'cards', 'nodes', 'assets', 'other'];

interface GroupedFiles {
  category: string;
  files: FileEntry[];
}

export function FileTree({
  files,
  selectedPath,
  onSelect,
  onDelete,
  onContextMenu,
  onRenameFile,
  onNewNode,
  onUploadAsset,
  onCreateFile,
  externalRenameTarget,
  onExternalRenameHandled,
  externalDeleteTarget,
  onExternalDeleteHandled,
}: FileTreeProps) {
  const groups = useMemo(() => {
    const map = new Map<string, FileEntry[]>();
    for (const f of files) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }

    const result: GroupedFiles[] = [];
    for (const cat of categoryOrder) {
      const f = map.get(cat);
      if (f && f.length > 0) {
        result.push({ category: cat, files: f });
      }
    }
    return result;
  }, [files]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const deleteTargetLabel = useMemo(() => {
    if (!deleteTarget) return null;
    const file = files.find((f) => f.path === deleteTarget);
    if (!file) return null;
    const labels: Record<string, string> = {
      manifest: 'Config File',
      workflow: 'Config File',
      rewards: 'Config File',
      cards: 'Config File',
      nodes: 'Content Node',
      assets: 'Asset',
    };
    return labels[file.category] ?? 'File';
  }, [deleteTarget, files]);

  useEffect(() => {
    if (externalRenameTarget) {
      setRenameTarget(externalRenameTarget);
      setRenameValue(externalRenameTarget.label);
      onExternalRenameHandled?.();
    }
  }, [externalRenameTarget]);

  useEffect(() => {
    if (externalDeleteTarget) {
      setDeleteTarget(externalDeleteTarget.path);
      onExternalDeleteHandled?.();
    }
  }, [externalDeleteTarget]);

  const handleRenameConfirm = useCallback(
    (file: FileEntry) => {
      const newName = renameValue.trim();
      if (!newName || newName === file.label) {
        setRenameTarget(null);
        return;
      }
      const dir = file.path.includes('/')
        ? file.path.substring(0, file.path.lastIndexOf('/') + 1)
        : '';
      const newPath = dir + newName;
      if (newPath === file.path) {
        setRenameTarget(null);
        return;
      }
      if (onRenameFile) {
        onRenameFile(file.path, newPath);
      }
      setRenameTarget(null);
    },
    [renameValue, onRenameFile],
  );

  return (
    <div className="border-outline-variant bg-surface-container-low flex-1 overflow-auto border-r text-sm">
      <div className="border-outline-variant text-on-surface-variant border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider">
        Package Files
      </div>
      {groups.map((group) => (
        <div key={group.category}>
          <div
            className="text-on-surface-variant flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu?.({ x: e.clientX, y: e.clientY, file: null, section: group.category });
            }}
          >
            <span>{categoryLabels[group.category] ?? group.category}</span>
            {group.category === 'nodes' && (
              <button
                type="button"
                className="text-primary hover:bg-primary-container flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewNode?.();
                }}
                title="New Content Node"
              >
                <Plus className="h-3 w-3" />
                New Node
              </button>
            )}
            {group.category === 'assets' && (
              <button
                type="button"
                className="text-primary hover:bg-primary-container flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadAsset?.();
                }}
                title="Upload Asset"
              >
                <Upload className="h-3 w-3" />
                Upload
              </button>
            )}
          </div>
          {group.files.map((file) => (
            <div
              key={file.path}
              className={`hover:bg-surface-container group flex cursor-pointer items-center justify-between px-3 py-1.5 ${
                selectedPath === file.path
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface'
              }`}
              onClick={() => onSelect(file.path)}
              role="treeitem"
              aria-selected={selectedPath === file.path}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(file.path);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu?.({ x: e.clientX, y: e.clientY, file, section: undefined });
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <FileIcon extension={file.extension} />
                {renameTarget?.path === file.path ? (
                  <div className="flex items-center gap-1">
                    <span className="text-on-surface-variant shrink-0 text-[10px]">
                      {file.path.includes('/')
                        ? file.path.substring(0, file.path.lastIndexOf('/') + 1)
                        : ''}
                    </span>
                    <input
                      className="border-primary bg-surface w-full min-w-0 rounded border px-1 py-0.5 text-xs outline-none"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRenameConfirm(file);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setRenameTarget(null);
                        }
                      }}
                      onBlur={() => {
                        handleRenameConfirm(file);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <span
                    className="truncate"
                    title={file.path}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setRenameTarget(file);
                      setRenameValue(file.label);
                    }}
                  >
                    {file.label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Always show nodes section with New Node button, even when empty */}
      {!groups.some((g) => g.category === 'nodes') && (
        <div>
          <div className="text-on-surface-variant flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
            <span>Content Nodes</span>
            <button
              type="button"
              className="text-primary hover:bg-primary-container flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onNewNode?.();
              }}
              title="New Content Node"
            >
              <Plus className="h-3 w-3" />
              New Node
            </button>
          </div>
        </div>
      )}

      {/* Always show assets section with Upload button, even when empty */}
      {!groups.some((g) => g.category === 'assets') && (
        <div>
          <div className="text-on-surface-variant flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
            <span>Assets</span>
            <button
              type="button"
              className="text-primary hover:bg-primary-container flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onUploadAsset?.();
              }}
              title="Upload Asset"
            >
              <Upload className="h-3 w-3" />
              Upload
            </button>
          </div>
        </div>
      )}

      {/* Config files section — show create buttons for missing files */}
      {(['manifest', 'workflow', 'rewards', 'cards'] as const).map((section) => {
        const hasFile = files.some((f) => {
          const target = section === 'manifest' ? 'package.json' : `${section}.json`;
          return f.path === target;
        });
        if (hasFile) return null;
        const fileName = section === 'manifest' ? 'package.json' : `${section}.json`;
        return (
          <div key={section}>
            <div className="text-on-surface-variant flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
              <span>{categoryLabels[section] ?? section}</span>
            </div>
            <div
              className="hover:bg-surface-container group flex cursor-pointer items-center gap-2 px-3 py-1.5"
              onClick={() => onCreateFile?.(section)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCreateFile?.(section);
                }
              }}
            >
              <Plus className="text-primary h-3.5 w-3.5" />
              <span className="text-primary text-xs font-medium">Create {fileName}</span>
            </div>
          </div>
        );
      })}

      {files.length === 0 && (
        <div className="text-on-surface-variant px-3 py-4 text-center text-xs">
          No editable files found
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {deleteTargetLabel ? `Delete ${deleteTargetLabel}` : 'Delete File'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-on-surface-variant text-sm">
            Are you sure you want to delete{' '}
            <span className="text-on-surface font-medium">{deleteTarget}</span>?
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">
            This will remove this file from the package.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget);
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const iconMap: Record<string, { Icon: typeof File; className: string }> = {
  '.json': { Icon: FileJson, className: 'text-secondary' },
  '.md': { Icon: FileText, className: 'text-primary' },
};

function FileIcon({ extension }: { extension: string }) {
  const mapped = iconMap[extension];
  if (mapped) {
    const { Icon: MappedIcon, className } = mapped;
    return <MappedIcon className={cn('h-4 w-4 shrink-0', className)} strokeWidth={1.5} />;
  }
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.avif'].includes(extension)) {
    return <FileImage className="text-success h-4 w-4 shrink-0" strokeWidth={1.5} />;
  }
  return <File className="text-on-surface-variant h-4 w-4 shrink-0" strokeWidth={1.5} />;
}
