import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DraftItem } from './types';

export interface TextSelection {
  start: number;
  end: number;
  text: string;
}

export interface EditorRegistration {
  getCurrentContent: () => string;
  applyToEditor: (item: DraftItem) => void;
  isDirty: () => boolean;
  kind: 'lesson' | 'quiz' | 'practice' | 'reflection' | 'other';
  path: string;
  title?: string;
}

interface EditorBridgeContextType {
  register: (registration: EditorRegistration) => void;
  unregister: () => void;
  currentEditor: EditorRegistration | null;
  selection: TextSelection | null;
  setSelection: (selection: TextSelection | null) => void;
}

const EditorBridgeContext = createContext<EditorBridgeContextType | null>(null);

export function readTextareaSelection(el: HTMLTextAreaElement): TextSelection | null {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start == null || end == null || start === end) return null;
  return { start, end, text: el.value.slice(start, end) };
}

export function EditorBridgeProvider({ children }: { children: ReactNode }) {
  const [currentEditor, setCurrentEditor] = useState<EditorRegistration | null>(null);
  const [selection, setSelectionState] = useState<TextSelection | null>(null);

  const register = useCallback((registration: EditorRegistration) => {
    setCurrentEditor(registration);
  }, []);

  const unregister = useCallback(() => {
    setCurrentEditor(null);
    setSelectionState(null);
  }, []);

  const setSelection = useCallback((next: TextSelection | null) => {
    setSelectionState(next);
  }, []);

  return (
    <EditorBridgeContext.Provider
      value={{ register, unregister, currentEditor, selection, setSelection }}
    >
      {children}
    </EditorBridgeContext.Provider>
  );
}

export function useEditorBridge() {
  const ctx = useContext(EditorBridgeContext);
  if (!ctx) {
    throw new Error('useEditorBridge must be used within an EditorBridgeProvider');
  }
  return ctx;
}
