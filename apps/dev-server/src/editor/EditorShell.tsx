import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as api from './api';
import type { FileEntry, EditorFile, EditorMode, ViewMode } from './types';
import { FileTree } from './FileTree';
import { ManifestEditor } from './ManifestEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { JSONNodeEditor } from './JSONNodeEditor';
import { WorkflowEditor } from './WorkflowEditor';
import { RewardsEditor } from './RewardsEditor';
import { CardsEditor } from './CardsEditor';
import { AssetManager } from './AssetManager';
import { RawJsonEditor } from './RawJsonEditor';

const NODE_TYPES = ['lesson', 'quiz', 'reflection', 'exercise', 'custom'] as const;

interface EditorShellProps {
  isOpen: boolean;
  onToggle: () => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

export function EditorShell({ mode, onModeChange: rawOnModeChange }: EditorShellProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<Map<string, EditorFile>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [_packageDir, setPackageDir] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showNewNode, setShowNewNode] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<string>('lesson');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFile = selectedPath ? (openFiles.get(selectedPath) ?? null) : null;

  const dirtyCount = useMemo(() => {
    let count = 0;
    for (const file of openFiles.values()) {
      if (file.isDirty) count++;
    }
    return count;
  }, [openFiles]);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const refreshFiles = useCallback(() => {
    api
      .listFiles()
      .then(setFiles)
      .catch(() => {});
  }, []);

  const onModeChange = useCallback(
    (newMode: EditorMode) => {
      if (newMode === 'preview' && dirtyCount > 0) {
        if (!window.confirm('You have unsaved changes. Save before switching to preview?')) {
          return;
        }
      }
      rawOnModeChange(newMode);
    },
    [rawOnModeChange, dirtyCount],
  );

  // Load files on mount
  useEffect(() => {
    async function load() {
      try {
        const [fileList, dir] = await Promise.all([api.listFiles(), api.getPackageDir()]);
        setFiles(fileList);
        setPackageDir(dir);

        if (fileList.length > 0) {
          const first = fileList[0];
          if (first) {
            setSelectedPath(first.path);
          }
        }
      } catch (err) {
        showToast('Failed to load files: ' + (err as Error).message, 'error');
      }
    }
    load();
  }, [showToast]);

  // Load file content when selected
  useEffect(() => {
    if (!selectedPath) return;
    if (openFiles.has(selectedPath)) return;

    async function loadContent() {
      try {
        const fileContent = await api.readFile(selectedPath!);
        setOpenFiles((prev) => {
          const next = new Map(prev);
          next.set(selectedPath!, {
            path: selectedPath!,
            content: fileContent.content,
            originalContent: fileContent.content,
            isDirty: false,
            validationError: null,
          });
          return next;
        });
      } catch (err) {
        showToast('Failed to read file: ' + (err as Error).message, 'error');
      }
    }
    loadContent();
  }, [selectedPath, openFiles, showToast]);

  const handleFileSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setViewMode('form');
  }, []);

  const handleFileDelete = useCallback(
    async (path: string) => {
      try {
        await api.deleteFile(path);
        refreshFiles();
        setOpenFiles((prev) => {
          const next = new Map(prev);
          next.delete(path);
          return next;
        });
        if (selectedPath === path) {
          setSelectedPath(null);
        }
        showToast(`Deleted ${path}`, 'success');
      } catch (err) {
        showToast('Failed to delete: ' + (err as Error).message, 'error');
      }
    },
    [selectedPath, showToast, refreshFiles],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!selectedPath) return;
      setOpenFiles((prev) => {
        const existing = prev.get(selectedPath);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(selectedPath, {
          ...existing,
          content,
          isDirty: content !== existing.originalContent,
          validationError: null,
        });
        return next;
      });
    },
    [selectedPath],
  );

  const handleSave = useCallback(async () => {
    if (!selectedPath || !currentFile) return;
    if (!currentFile.isDirty) {
      showToast('No changes to save', 'info');
      return;
    }

    setSaving(true);
    try {
      await api.writeFile(selectedPath, currentFile.content, true);
      setOpenFiles((prev) => {
        const next = new Map(prev);
        const existing = next.get(selectedPath);
        if (existing) {
          next.set(selectedPath, {
            ...existing,
            originalContent: existing.content,
            isDirty: false,
            validationError: null,
          });
        }
        return next;
      });
      showToast('Saved successfully! Preview will reload.', 'success');
    } catch (err) {
      const message = (err as Error).message;
      showToast(`Save failed: ${message}`, 'error');
      if (message.includes('Validation failed')) {
        setOpenFiles((prev) => {
          const next = new Map(prev);
          const existing = next.get(selectedPath);
          if (existing) {
            next.set(selectedPath, {
              ...existing,
              validationError: message,
            });
          }
          return next;
        });
      }
    } finally {
      setSaving(false);
    }
  }, [selectedPath, currentFile, showToast]);

  const handleSaveAll = useCallback(async () => {
    const dirtyFiles = Array.from(openFiles.values()).filter((f) => f.isDirty);
    if (dirtyFiles.length === 0) {
      showToast('No changes to save', 'info');
      return;
    }

    setSavingAll(true);
    let errorCount = 0;
    for (const file of dirtyFiles) {
      try {
        await api.writeFile(file.path, file.content, true);
        setOpenFiles((prev) => {
          const next = new Map(prev);
          const existing = next.get(file.path);
          if (existing) {
            next.set(file.path, {
              ...existing,
              originalContent: existing.content,
              isDirty: false,
              validationError: null,
            });
          }
          return next;
        });
      } catch (err) {
        errorCount++;
        const message = (err as Error).message;
        showToast(`Save failed for ${file.path}: ${message}`, 'error');
        if (message.includes('Validation failed')) {
          setOpenFiles((prev) => {
            const next = new Map(prev);
            const existing = next.get(file.path);
            if (existing) {
              next.set(file.path, {
                ...existing,
                validationError: message,
              });
            }
            return next;
          });
        }
        break;
      }
    }
    if (errorCount === 0) {
      showToast(`Saved ${dirtyFiles.length} file(s)! Preview will reload.`, 'success');
    }
    setSavingAll(false);
  }, [openFiles, showToast]);

  const handleUndo = useCallback(() => {
    if (!selectedPath || !currentFile) return;
    setOpenFiles((prev) => {
      const next = new Map(prev);
      const existing = next.get(selectedPath);
      if (existing) {
        next.set(selectedPath, {
          ...existing,
          content: existing.originalContent,
          isDirty: false,
          validationError: null,
        });
      }
      return next;
    });
    showToast('Reverted to last saved state', 'info');
  }, [selectedPath, currentFile, showToast]);

  const handleCreateNode = useCallback(async () => {
    if (!newNodeName.trim()) return;
    const ext = newNodeType === 'lesson' ? '.md' : '.json';
    const fileName = newNodeName.trim().toLowerCase().replace(/\s+/g, '-') + ext;
    const filePath = `nodes/${fileName}`;

    try {
      const content =
        newNodeType === 'lesson'
          ? `# ${newNodeName.trim()}\n\nStart writing here...`
          : JSON.stringify(
              {
                type: newNodeType,
                title: newNodeName.trim(),
              },
              null,
              2,
            );

      await api.createFile(filePath, content, false);
      refreshFiles();
      setShowNewNode(false);
      setNewNodeName('');
      setNewNodeType('lesson');
      setSelectedPath(filePath);
      showToast(`Created ${filePath}`, 'success');
    } catch (err) {
      showToast('Failed to create node: ' + (err as Error).message, 'error');
    }
  }, [newNodeName, newNodeType, refreshFiles, showToast]);

  const handleStructuredDataChange = useCallback(
    (data: Record<string, unknown>) => {
      if (!selectedPath) return;
      const content = JSON.stringify(data, null, 2);
      handleContentChange(content);
    },
    [selectedPath, handleContentChange],
  );

  const handleRefreshAssets = useCallback(() => {
    refreshFiles();
  }, [refreshFiles]);

  const currentExtension = currentFile?.path ? '.' + (currentFile.path.split('.').pop() ?? '') : '';
  const isJsonFile = currentExtension === '.json';

  const fileEditorContent = useMemo(() => {
    if (!currentFile) return null;

    if (currentFile.path === 'package.json') {
      if (viewMode === 'raw') {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
      try {
        const parsed = JSON.parse(currentFile.content);
        const nodePaths = files
          .filter((f) => f.category === 'nodes')
          .map((f) => f.path)
          .sort();
        return (
          <ManifestEditor
            data={parsed}
            onChange={(d) => handleStructuredDataChange(d as unknown as Record<string, unknown>)}
            nodePaths={nodePaths}
          />
        );
      } catch {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
    }

    if (currentFile.path === 'workflow.json') {
      if (viewMode === 'raw') {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
      try {
        const parsed = JSON.parse(currentFile.content);
        return (
          <WorkflowEditor
            data={parsed}
            onChange={(d) => handleStructuredDataChange(d as unknown as Record<string, unknown>)}
          />
        );
      } catch {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
    }

    if (currentFile.path === 'rewards.json') {
      if (viewMode === 'raw') {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
      try {
        const parsed = JSON.parse(currentFile.content);
        return (
          <RewardsEditor
            data={parsed}
            onChange={(d) => handleStructuredDataChange(d as unknown as Record<string, unknown>)}
          />
        );
      } catch {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
    }

    if (currentFile.path === 'cards.json') {
      if (viewMode === 'raw') {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
      try {
        const parsed = JSON.parse(currentFile.content);
        return (
          <CardsEditor
            data={parsed}
            onChange={(d) => handleStructuredDataChange(d as unknown as Record<string, unknown>)}
          />
        );
      } catch {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
    }

    if (currentFile.path.startsWith('nodes/') && isJsonFile) {
      if (viewMode === 'raw') {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
      try {
        const parsed = JSON.parse(currentFile.content);
        return (
          <JSONNodeEditor
            data={parsed}
            onChange={(d) => handleStructuredDataChange(d as unknown as Record<string, unknown>)}
            fileName={currentFile.path}
          />
        );
      } catch {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
    }

    if (currentExtension === '.md') {
      return (
        <MarkdownEditor
          content={currentFile.content}
          onChange={handleContentChange}
          fileName={currentFile.path}
        />
      );
    }

    if (currentExtension === '.json') {
      if (viewMode === 'raw') {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
      try {
        const parsed = JSON.parse(currentFile.content);
        return (
          <JSONNodeEditor
            data={parsed}
            onChange={(d) => handleStructuredDataChange(d as unknown as Record<string, unknown>)}
            fileName={currentFile.path}
          />
        );
      } catch {
        return (
          <RawJsonEditor
            content={currentFile.content}
            onChange={handleContentChange}
            fileName={currentFile.path}
          />
        );
      }
    }

    return (
      <div className="flex h-full flex-col">
        <div className="mb-2">
          <span className="text-on-surface-variant text-xs font-medium">{currentFile.path}</span>
        </div>
        <textarea
          className="border-outline-variant flex-1 resize-none rounded border p-3 font-mono text-sm focus:outline-none"
          value={currentFile.content}
          onChange={(e) => handleContentChange(e.target.value)}
          spellCheck={false}
          aria-label="File editor"
        />
      </div>
    );
  }, [
    currentFile,
    viewMode,
    handleContentChange,
    handleStructuredDataChange,
    isJsonFile,
    currentExtension,
  ]);

  const assetFiles = useMemo(
    () => files.filter((f) => f.category === 'assets').map((f) => f.path),
    [files],
  );

  const showAssetManager = mode === 'edit' && selectedPath?.startsWith('assets/');

  return (
    <div className="bg-surface flex h-full flex-col" role="region" aria-label="Package editor">
      <div className="border-outline-variant bg-surface-container-low flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="bg-primary-container text-on-primary-container rounded px-1.5 py-0.5 text-[10px] font-semibold">
            EDITOR
          </span>
          {mode === 'edit' && (
            <>
              <span className="text-on-surface-variant text-xs">Edit Mode</span>
              {dirtyCount > 0 && (
                <span className="bg-secondary-container text-secondary rounded px-1.5 py-0.5 text-[10px] font-medium">
                  {dirtyCount} unsaved
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'edit' && isJsonFile && (
            <button
              type="button"
              className={`rounded px-2 py-1 text-xs font-medium ${
                viewMode === 'raw'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container'
              }`}
              onClick={() => setViewMode(viewMode === 'raw' ? 'form' : 'raw')}
            >
              {viewMode === 'raw' ? 'Form View' : 'Raw JSON'}
            </button>
          )}
          <button
            type="button"
            className={`rounded px-3 py-1 text-xs font-medium ${
              mode === 'edit'
                ? 'bg-success hover:bg-success/80 text-white'
                : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container'
            }`}
            onClick={() => onModeChange(mode === 'preview' ? 'edit' : 'preview')}
          >
            {mode === 'edit' ? 'Done Editing' : 'Edit Package'}
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="border-outline-variant w-56 shrink-0 overflow-hidden border-r">
            <FileTree
              files={files}
              selectedPath={selectedPath}
              onSelect={handleFileSelect}
              onDelete={handleFileDelete}
            />
            <div className="border-outline-variant border-t px-3 py-2">
              <button
                type="button"
                className="text-primary hover:bg-primary-container flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                onClick={() => setShowNewNode(true)}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Node
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {selectedPath && (
              <div className="border-outline-variant bg-surface flex items-center border-b px-2">
                <div className="border-outline-variant flex items-center gap-1 border-r pr-2">
                  <span className="text-on-surface-variant text-xs">
                    {currentFile?.isDirty ? '●' : '○'}
                  </span>
                  <span className="text-on-surface max-w-[200px] truncate text-xs font-medium">
                    {selectedPath}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-on-surface-variant hover:bg-surface-variant disabled:text-muted-foreground ml-2 rounded px-2 py-1 text-xs font-medium"
                  onClick={handleUndo}
                  disabled={!currentFile?.isDirty}
                  title="Revert to last saved state"
                >
                  Undo
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  className="text-on-surface-variant hover:bg-surface-variant disabled:text-muted-foreground rounded px-2 py-1 text-xs font-medium"
                  onClick={handleSaveAll}
                  disabled={dirtyCount === 0 || savingAll}
                >
                  {savingAll ? 'Saving...' : `Save All${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
                </button>
                <button
                  type="button"
                  className="text-primary hover:bg-primary-container disabled:text-muted-foreground ml-1 rounded px-2 py-1 text-xs font-medium"
                  onClick={handleSave}
                  disabled={!currentFile?.isDirty || saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto p-3">
              {showAssetManager ? (
                <AssetManager assets={assetFiles} onRefresh={handleRefreshAssets} />
              ) : currentFile ? (
                <div>
                  {currentFile.validationError && (
                    <div className="border-error-container bg-error-container mb-3 rounded-lg border px-3 py-2">
                      <p className="text-error text-xs font-medium">Validation Error:</p>
                      <p className="text-error mt-0.5 text-xs">{currentFile.validationError}</p>
                    </div>
                  )}
                  {fileEditorContent}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="text-on-surface-variant/40 mx-auto mb-2 h-10 w-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                    <p className="text-on-surface-variant text-sm">
                      Select a file from the sidebar to edit
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-low flex flex-1 items-center justify-center">
          <div className="text-center">
            <svg
              className="text-on-surface-variant/40 mx-auto mb-3 h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-on-surface-variant text-sm font-medium">Package Preview Below</p>
            <p className="text-on-surface-variant mt-1 text-xs">
              Click "Edit Package" to start editing files
            </p>
          </div>
        </div>
      )}

      {showNewNode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowNewNode(false)}
        >
          <div
            className="bg-surface shadow-elevation-modal w-80 rounded-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-on-surface mb-3 text-sm font-semibold">New Content Node</h3>
            <div className="space-y-3">
              <div>
                <label className="text-on-surface-variant mb-0.5 block text-xs font-medium">
                  Filename
                </label>
                <input
                  type="text"
                  className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1"
                  placeholder="e.g., introduction"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNode();
                    if (e.key === 'Escape') setShowNewNode(false);
                  }}
                />
                <p className="text-on-surface-variant mt-1 text-[10px]">
                  Will create: nodes/
                  {newNodeName.trim().toLowerCase().replace(/\s+/g, '-') || 'filename'}
                  {newNodeType === 'lesson' ? '.md' : '.json'}
                </p>
              </div>
              <div>
                <label className="text-on-surface-variant mb-0.5 block text-xs font-medium">
                  Type
                </label>
                <select
                  className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1"
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value)}
                >
                  {NODE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="text-on-surface-variant hover:bg-surface-variant rounded px-3 py-1.5 text-xs font-medium"
                onClick={() => setShowNewNode(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-primary text-on-primary hover:bg-primary/90 rounded px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                onClick={handleCreateNode}
                disabled={!newNodeName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`shadow-elevation-sticky fixed bottom-20 right-4 z-50 max-w-sm rounded-lg px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'bg-success text-white'
              : toast.type === 'error'
                ? 'bg-destructive text-white'
                : 'bg-surface text-on-surface'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
