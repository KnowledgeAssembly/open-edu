import { useState, useCallback, useRef, useMemo, type ReactNode, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@open-edu/design-system';
import { useCompanion } from './CompanionProvider';
import type { DictionaryEntry } from '@open-edu/ai-companion';

export interface WordTapHandlerProps {
  children: ReactNode;
}

interface PopoverState {
  word: string;
  entry: DictionaryEntry | null;
  suggestions: string[];
  x: number;
  y: number;
  loading: boolean;
}

export function WordTapHandler({ children }: WordTapHandlerProps): JSX.Element {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const { search, setPanelState, sendMessage } = useCompanion();

  const isTextSelection = useCallback((): boolean => {
    const sel = window.getSelection();
    return !!sel && !sel.isCollapsed && sel.toString().trim().length > 0;
  }, []);

  const getWordAtPoint = useCallback((e: MouseEvent<HTMLDivElement>): string | null => {
    const doc = document as Document & { caretRangeFromPoint?(x: number, y: number): Range | null };
    const range = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
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
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const mousedown = mouseDownPos.current;
      mouseDownPos.current = null;

      if (!mousedown) return;

      const dx = Math.abs(e.clientX - mousedown.x);
      const dy = Math.abs(e.clientY - mousedown.y);
      const wasDrag = dx > 5 || dy > 5;

      if (wasDrag) return;
      if (isTextSelection()) return;

      const word = getWordAtPoint(e);
      if (!word) return;

      const result = search(word);
      const { entry, suggestions } = result.instant;

      if (!entry && suggestions.length === 0) {
        const enrichedPromise = result.enriched;
        setPopover({
          word,
          entry: null,
          suggestions: [],
          x: e.clientX,
          y: e.clientY,
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
        x: e.clientX,
        y: e.clientY,
        loading: false,
      });
    },
    [search, getWordAtPoint, isTextSelection],
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
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
          )}
          style={{ left: `${left}px`, top: `${top}px` }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={`Definition for ${popover.word}`}
          data-testid="word-tap-popover"
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
                  <SparklesIcon />
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
                <SparklesIcon />
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
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      data-testid="word-tap-container"
    >
      {children}
      {popoverElement}
    </div>
  );
}

function SparklesIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4m0 10v4M5 12H3m18 0h-2M6.34 6.34l-1.42-1.42m14.14 14.14l-1.42-1.42M9.88 9.88l-2.12-2.12m8.48 8.48l-2.12-2.12" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
