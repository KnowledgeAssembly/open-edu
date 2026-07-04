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
        className="bg-inverse-surface/50 fixed inset-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative flex max-h-[400px] w-full max-w-[560px] flex-col overflow-hidden rounded-xl',
          'bg-surface shadow-elevation-modal border-outline-variant border',
        )}
      >
        <div className="border-outline-variant flex items-center border-b px-4">
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
            className="text-on-surface placeholder:text-on-surface-variant h-12 flex-1 border-none bg-transparent text-sm outline-none"
          />
          <kbd className="border-outline-variant text-on-surface-variant hidden items-center gap-1 rounded border px-1.5 py-0.5 text-xs sm:inline-flex">
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
        <div className="text-on-surface-variant px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
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
      className="text-on-surface aria-selected:bg-surface-container-high hover:bg-surface-container-high flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40"
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
    <div className="text-on-surface-variant py-6 text-center text-sm">
      {children ?? 'No results found.'}
    </div>
  );
}
