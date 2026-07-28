import { useMemo } from 'react';
import type { FileEntry } from './types';
import { Trash2, FileJson, FileText, FileImage, File } from 'lucide-react';
import { cn } from '@open-edu/design-system';

interface FileTreeProps {
  files: FileEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
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

export function FileTree({ files, selectedPath, onSelect, onDelete }: FileTreeProps) {
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

  return (
    <div className="border-outline-variant bg-surface-container-low h-full overflow-auto border-r text-sm">
      <div className="border-outline-variant text-on-surface-variant border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider">
        Package Files
      </div>
      {groups.map((group) => (
        <div key={group.category}>
          <div className="text-on-surface-variant px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
            {categoryLabels[group.category] ?? group.category}
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
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileIcon extension={file.extension} />
                <span className="truncate" title={file.path}>
                  {file.label}
                </span>
              </div>
              <button
                type="button"
                className="text-on-surface-variant hover:bg-error-container hover:text-error shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${file.path}"?`)) {
                    onDelete(file.path);
                  }
                }}
                aria-label={`Delete ${file.path}`}
                title="Delete file"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ))}
      {files.length === 0 && (
        <div className="text-on-surface-variant px-3 py-4 text-center text-xs">
          No editable files found
        </div>
      )}
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
