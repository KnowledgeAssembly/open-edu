import { useState, useCallback, useRef, useMemo, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@open-edu/design-system';
import { useCompanion } from './CompanionProvider';
import { Sparkles } from 'lucide-react';
import type { DictionaryEntry } from '@open-edu/ai-companion';

export interface WordTapHandlerProps {
  children: ReactNode;
  className?: string;
}

interface PopoverState {
  word: string;
  entry: DictionaryEntry | null;
  suggestions: string[];
  x: number;
  y: number;
  loading: boolean;
}

const DOUBLE_TAP_TIME_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 20;

export function WordTapHandler({ children, className }: WordTapHandlerProps): JSX.Element {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);
  const { search, setPanelState, sendMessage } = useCompanion();

  const getRangeAtPoint = useCallback((x: number, y: number): Range | null => {
    const doc = document as Document & {
      caretRangeFromPoint?(x: number, y: number): Range | null;
      caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
    };

    if (doc.caretRangeFromPoint) {
      return doc.caretRangeFromPoint(x, y);
    }

    if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(x, y);
      if (!pos) return null;
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      return range;
    }

    return null;
  }, []);

  const getWordAtPoint = useCallback(
    (x: number, y: number): string | null => {
      const range = getRangeAtPoint(x, y);
      if (!range) return null;

      const textNode = range.startContainer;
      if (textNode.nodeType !== Node.TEXT_NODE) return null;

      const text = textNode.textContent ?? '';
      const offset = range.startOffset;

      const textBefore = text.slice(0, offset);
      const textAfter = text.slice(offset);

      const startMatch = textBefore.match(/(\w+)$/);
      const endMatch = textAfter.match(/^(\w+)/);

      const prefix = startMatch?.[1] ?? '';
      const suffix = endMatch?.[1] ?? '';
      const word = prefix + suffix;

      if (!word || word.length < 1) return null;
      if (word.length === 1 && !/[a-zA-Z]/.test(word)) return null;

      return word.toLowerCase();
    },
    [getRangeAtPoint],
  );

  const lookupWord = useCallback(
    (word: string, x: number, y: number) => {
      const result = search(word);
      const { entry, suggestions } = result.instant;

      if (!entry && suggestions.length === 0) {
        const enrichedPromise = result.enriched;
        setPopover({
          word,
          entry: null,
          suggestions: [],
          x,
          y,
          loading: true,
        });
        enrichedPromise.then((enriched) => {
          if (enriched.ftsResults.length > 0) {
            setPopover((prev) =>
              prev && prev.word === word
                ? {
                    ...prev,
                    entry: enriched.ftsResults[0]!,
                    suggestions: enriched.ftsResults.slice(1, 5).map((r) => r.word),
                    loading: false,
                  }
                : prev,
            );
          } else {
            setPopover((prev) =>
              prev && prev.word === word ? { ...prev, loading: false, suggestions: [] } : prev,
            );
          }
        });
        return;
      }

      setPopover({
        word,
        entry,
        suggestions: suggestions.slice(0, 5),
        x,
        y,
        loading: false,
      });
    },
    [search],
  );

  const handlePointerDown = useCallback((x: number, y: number) => {
    pointerDownPos.current = { x, y };
  }, []);

  const handlePointerUp = useCallback(
    (x: number, y: number) => {
      const pointerDown = pointerDownPos.current;
      pointerDownPos.current = null;

      if (!pointerDown) return;

      const dx = Math.abs(x - pointerDown.x);
      const dy = Math.abs(y - pointerDown.y);
      const wasDrag = dx > 5 || dy > 5;

      if (wasDrag) return;

      const now = Date.now();
      const prev = lastTap.current;
      lastTap.current = { x, y, time: now };

      const isDoubleTap =
        prev &&
        now - prev.time < DOUBLE_TAP_TIME_MS &&
        Math.abs(x - prev.x) < DOUBLE_TAP_DISTANCE_PX &&
        Math.abs(y - prev.y) < DOUBLE_TAP_DISTANCE_PX;

      if (!isDoubleTap) return;

      window.getSelection()?.removeAllRanges();

      const word = getWordAtPoint(x, y);
      if (!word) return;

      lookupWord(word, x, y);
    },
    [getWordAtPoint, lookupWord],
  );

  const closePopover = useCallback(() => {
    setPopover(null);
  }, []);

  const handleAskAi = useCallback(() => {
    if (!popover) return;
    setPanelState('floating');
    sendMessage(`Tell me more about "${popover.word}"`);
    closePopover();
  }, [popover, setPanelState, sendMessage, closePopover]);

  const popoverElement = useMemo(() => {
    if (!popover) return null;

    const popoverWidth = 300;
    let left = popover.x - popoverWidth / 2;
    let top = popover.y - 12;

    if (left < 8) left = 8;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (top < 8) top = popover.y + 12;

    const hasContent = popover.entry || popover.loading || popover.suggestions.length > 0;

    return createPortal(
      <div
        className="fixed inset-0 z-[9998]"
        onClick={closePopover}
        onKeyDown={(e) => {
          if (e.key === 'Escape') closePopover();
        }}
        role="presentation"
      >
        <div
          className={cn(
            'bg-surface text-on-surface fixed z-[9999] w-[300px] rounded-lg border p-4 shadow-lg',
          )}
          style={{ left: `${left}px`, top: `${top}px` }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={`Definition for ${popover.word}`}
          data-testid="word-tap-popover"
          data-state="open"
        >
          {popover.loading && (
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 border-t-primary h-4 w-4 animate-spin rounded-full border-2 border-transparent" />
              <span className="text-on-surface-variant text-sm">Looking up...</span>
            </div>
          )}

          {!popover.loading && hasContent && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base font-semibold">{popover.word}</span>
                {popover.entry?.phonetic && (
                  <span className="text-on-surface-variant text-sm">
                    /{popover.entry.phonetic}/
                  </span>
                )}
                {popover.entry?.partOfSpeech && (
                  <span className="bg-surface-container text-on-surface-variant rounded px-1.5 py-0.5 text-xs italic">
                    {popover.entry.partOfSpeech}
                  </span>
                )}
              </div>

              {popover.entry?.definitions.map((def, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <p className="text-sm">{def.definition}</p>
                  {def.example && (
                    <p className="text-on-surface-variant mt-0.5 text-xs italic">
                      &ldquo;{def.example}&rdquo;
                    </p>
                  )}
                </div>
              ))}

              {popover.entry?.synonyms && popover.entry.synonyms.length > 0 && (
                <div className="mt-3">
                  <span className="text-on-surface-variant text-xs font-medium">Synonyms: </span>
                  <span className="text-xs">{popover.entry.synonyms.slice(0, 5).join(', ')}</span>
                </div>
              )}

              {popover.suggestions.length > 0 && !popover.entry && (
                <div>
                  <p className="text-on-surface-variant mb-1 text-xs font-medium">Did you mean?</p>
                  <div className="flex flex-wrap gap-1">
                    {popover.suggestions.map((s) => (
                      <span
                        key={s}
                        className="bg-surface-container text-on-surface-variant rounded px-2 py-0.5 text-xs"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 border-t pt-2">
                <button
                  type="button"
                  onClick={handleAskAi}
                  className="text-primary hover:text-primary-hover flex items-center gap-1 text-xs font-medium transition-colors"
                  data-testid="word-popover-ask-ai"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Ask AI about &ldquo;{popover.word}&rdquo;
                </button>
              </div>
            </>
          )}

          {!popover.loading && !hasContent && (
            <div>
              <p className="text-sm font-medium">{popover.word}</p>
              <p className="text-on-surface-variant mt-1 text-xs">
                No definition found for this word.
              </p>
              <button
                type="button"
                onClick={handleAskAi}
                className="text-primary hover:text-primary-hover mt-2 flex items-center gap-1 text-xs font-medium transition-colors"
                data-testid="word-popover-ask-ai"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Ask AI about &ldquo;{popover.word}&rdquo;
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body,
    );
  }, [popover, closePopover, handleAskAi]);

  return (
    <div
      className={className}
      onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
      onMouseUp={(e) => handlePointerUp(e.clientX, e.clientY)}
      onTouchStart={(e: TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        if (touch) handlePointerDown(touch.clientX, touch.clientY);
      }}
      onTouchEnd={(e: TouchEvent<HTMLDivElement>) => {
        const touch = e.changedTouches[0];
        if (touch) handlePointerUp(touch.clientX, touch.clientY);
      }}
      data-testid="word-tap-container"
    >
      {children}
      {popoverElement}
    </div>
  );
}
