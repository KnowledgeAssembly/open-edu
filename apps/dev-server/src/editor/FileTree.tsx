import { useMemo } from 'react';
import type { FileEntry } from './types';

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
    <div className="h-full overflow-auto border-r border-gray-200 bg-gray-50 text-sm">
      <div className="border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Package Files
      </div>
      {groups.map((group) => (
        <div key={group.category}>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {categoryLabels[group.category] ?? group.category}
          </div>
          {group.files.map((file) => (
            <div
              key={file.path}
              className={`group flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-gray-100 ${
                selectedPath === file.path ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
              {file.category !== 'assets' && (
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-gray-400 opacity-0 hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${file.path}"?`)) {
                      onDelete(file.path);
                    }
                  }}
                  aria-label={`Delete ${file.path}`}
                  title="Delete file"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
      {files.length === 0 && (
        <div className="px-3 py-4 text-center text-xs text-gray-400">No editable files found</div>
      )}
    </div>
  );
}

function FileIcon({ extension }: { extension: string }) {
  const color = extColor(extension);
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function extColor(ext: string): string {
  switch (ext) {
    case '.json':
      return '#f59e0b';
    case '.md':
      return '#3b82f6';
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.webp':
      return '#10b981';
    default:
      return '#6b7280';
  }
}
