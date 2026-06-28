import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function CommandPalette({
  open,
  onOpenChange,
  placeholder = 'Search commands...',
  children,
}: CommandPaletteProps): JSX.Element {
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      inputRef.current?.focus();
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  if (!open) return <></>;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Global command palette"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full max-w-[560px] max-h-[400px] flex flex-col overflow-hidden rounded-xl',
          'bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-outline-variant',
        )}
      >
        <div className="flex items-center border-b border-outline-variant px-4">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-on-surface-variant mr-3 shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search commands"
            className="flex-1 h-12 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-outline-variant px-1.5 py-0.5 text-xs text-on-surface-variant">
            ESC
          </kbd>
        </div>
        <div className="flex-1 overflow-y-auto py-2">{children}</div>
      </div>
    </div>
  );
}

export interface CommandGroupProps {
  heading?: string;
  children?: React.ReactNode;
}

export function CommandGroup({ heading, children }: CommandGroupProps): JSX.Element {
  return (
    <div className="py-1" role="group" aria-label={heading}>
      {heading && (
        <div className="px-4 py-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

export interface CommandItemProps {
  onSelect?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function CommandItem({ onSelect, disabled, children }: CommandItemProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      role="option"
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface bg-transparent border-none text-left cursor-pointer aria-selected:bg-surface-container-high hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export interface CommandEmptyProps {
  children?: React.ReactNode;
}

export function CommandEmpty({ children }: CommandEmptyProps): JSX.Element {
  return (
    <div className="py-6 text-center text-sm text-on-surface-variant">
      {children ?? 'No results found.'}
    </div>
  );
}
