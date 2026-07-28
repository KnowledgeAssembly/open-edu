import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Toaster } from '@open-edu/design-system';
import { toast } from 'sonner';
import { Plus, Eye, FileText } from 'lucide-react';

const NODE_TYPES = ['lesson', 'quiz', 'reflection', 'exercise', 'custom'] as const;

interface EditorShellProps {
  isOpen: boolean;
  onToggle: () => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

export function EditorShell({ mode, onModeChange: rawOnModeChange }: EditorShellProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<Map<string, EditorFile>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [_packageDir, setPackageDir] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [showNewNode, setShowNewNode] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<string>('lesson');
  const [pendingModeChange, setPendingModeChange] = useState<EditorMode | null>(null);

  const currentFile = selectedPath ? (openFiles.get(selectedPath) ?? null) : null;

  const dirtyCount = useMemo(() => {
    let count = 0;
    for (const file of openFiles.values()) {
      if (file.isDirty) count++;
    }
    return count;
  }, [openFiles]);

  const refreshFiles = useCallback(() => {
    api
      .listFiles()
      .then(setFiles)
      .catch(() => {});
  }, []);

  const onModeChange = useCallback(
    (newMode: EditorMode) => {
      if (newMode === 'preview' && dirtyCount > 0) {
        setPendingModeChange(newMode);
        return;
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
        toast.error('Failed to load files: ' + (err as Error).message);
      }
    }
    load();
  }, []);

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
        toast.error('Failed to read file: ' + (err as Error).message);
      }
    }
    loadContent();
  }, [selectedPath, openFiles]);

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
        toast.success(`Deleted ${path}`);
      } catch (err) {
        toast.error('Failed to delete: ' + (err as Error).message);
      }
    },
    [selectedPath, refreshFiles],
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
      toast('No changes to save');
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
      toast.success('Saved successfully! Preview will reload.');
    } catch (err) {
      const message = (err as Error).message;
      toast.error(`Save failed: ${message}`);
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
  }, [selectedPath, currentFile]);

  const handleSaveAll = useCallback(async () => {
    const dirtyFiles = Array.from(openFiles.values()).filter((f) => f.isDirty);
    if (dirtyFiles.length === 0) {
      toast('No changes to save');
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
        toast.error(`Save failed for ${file.path}: ${message}`);
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
      toast.success(`Saved ${dirtyFiles.length} file(s)! Preview will reload.`);
    }
    setSavingAll(false);
  }, [openFiles]);

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
    toast('Reverted to last saved state');
  }, [selectedPath, currentFile]);

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
      toast.success(`Created ${filePath}`);
    } catch (err) {
      toast.error('Failed to create node: ' + (err as Error).message);
    }
  }, [newNodeName, newNodeType, refreshFiles]);

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
            <Button
              variant={viewMode === 'raw' ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => setViewMode(viewMode === 'raw' ? 'form' : 'raw')}
            >
              {viewMode === 'raw' ? 'Form View' : 'Raw JSON'}
            </Button>
          )}
          <Button
            variant={mode === 'edit' ? 'default' : 'outline'}
            size="sm"
            className={mode === 'edit' ? 'bg-success hover:bg-success/90' : ''}
            onClick={() => onModeChange(mode === 'preview' ? 'edit' : 'preview')}
          >
            {mode === 'edit' ? 'Done Editing' : 'Edit Package'}
          </Button>
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
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:bg-primary-container w-full justify-start gap-1 text-xs font-medium"
                onClick={() => setShowNewNode(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Node
              </Button>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-on-surface-variant text-xs font-medium"
                  onClick={handleUndo}
                  disabled={!currentFile?.isDirty}
                  title="Revert to last saved state"
                >
                  Undo
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-on-surface-variant text-xs font-medium"
                  onClick={handleSaveAll}
                  disabled={dirtyCount === 0 || savingAll}
                >
                  {savingAll ? 'Saving...' : `Save All${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs font-medium"
                  onClick={handleSave}
                  disabled={!currentFile?.isDirty || saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
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
                    <FileText
                      className="text-on-surface-variant/40 mx-auto mb-2 h-10 w-10"
                      strokeWidth={1}
                    />
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
            <Eye className="text-on-surface-variant/40 mx-auto mb-3 h-12 w-12" strokeWidth={1} />
            <p className="text-on-surface-variant text-sm font-medium">Package Preview Below</p>
            <p className="text-on-surface-variant mt-1 text-xs">
              Click "Edit Package" to start editing files
            </p>
          </div>
        </div>
      )}

      <Dialog open={showNewNode} onOpenChange={setShowNewNode}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Content Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-on-surface-variant mb-0.5 block text-xs font-medium">
                Filename
              </label>
              <Input
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
              <Select value={newNodeType} onValueChange={setNewNodeType}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewNode(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateNode} disabled={!newNodeName.trim()}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingModeChange !== null} onOpenChange={(open) => {
        if (!open) setPendingModeChange(null);
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p className="text-on-surface-variant text-sm">
            You have unsaved changes. Switch to preview anyway?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingModeChange(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (pendingModeChange) {
                  rawOnModeChange(pendingModeChange);
                }
                setPendingModeChange(null);
              }}
            >
              Switch Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="bottom-right" />
    </div>
  );
}
