import { useState, useEffect, useRef, useCallback } from 'react';
import type { NoteRecord } from '../notesStorage';
import { nowIso } from '../notesStorage';

export type SaveStatus = 'saved' | 'saving' | 'failed' | 'idle';

export function useDebouncedAutosave(
  note: NoteRecord,
  save: (n: NoteRecord) => Promise<boolean>,
  opts?: { debounceMs?: number },
): { status: SaveStatus; flush: () => Promise<void> } {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  const noteRef = useRef(note);
  const pendingRef = useRef(false);
  saveRef.current = save;
  const doSave = useCallback(async (n: NoteRecord) => {
    if (n.title === '' && n.content === '') return;
    setStatus('saving');
    const saved = await saveRef.current({ ...n, updatedAt: nowIso() });
    setStatus(saved ? 'saved' : 'failed');
  }, []);

  useEffect(() => {
    if (note.title === '' && note.content === '') return;
    if (note.title === noteRef.current.title && note.content === noteRef.current.content) return;
    pendingRef.current = true;
    setStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pendingRef.current = false;
      void doSave(note);
    }, opts?.debounceMs ?? 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [note.title, note.content, note.favorite, doSave, opts?.debounceMs]);

  useEffect(() => {
    noteRef.current = note;
  });

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current || status === 'saving') {
      pendingRef.current = false;
      await doSave(noteRef.current);
    }
  }, [doSave, status]);

  return { status, flush };
}
