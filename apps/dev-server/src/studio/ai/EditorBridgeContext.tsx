import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DraftItem } from './types';

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
}

const EditorBridgeContext = createContext<EditorBridgeContextType | null>(null);

export function EditorBridgeProvider({ children }: { children: ReactNode }) {
  const [currentEditor, setCurrentEditor] = useState<EditorRegistration | null>(null);

  const register = useCallback((registration: EditorRegistration) => {
    setCurrentEditor(registration);
  }, []);

  const unregister = useCallback(() => {
    setCurrentEditor(null);
  }, []);

  return (
    <EditorBridgeContext.Provider value={{ register, unregister, currentEditor }}>
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