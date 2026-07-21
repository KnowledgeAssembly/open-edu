import { useState, useRef, useEffect } from 'react';
import type { ThemeId } from '../themes/types.js';

const themeInfo: Array<{ id: ThemeId; name: string; description: string; swatches: string[] }> = [
  {
    id: 'lumina-scholastica',
    name: 'OpenEdu Light',
    description: 'Default calm learning',
    swatches: ['surface', 'primary', 'on-surface', 'primary-container'],
  },
  {
    id: 'nocturnal',
    name: 'OpenEdu Dark',
    description: 'Calm dark for deep focus',
    swatches: ['surface', 'primary', 'on-surface', 'primary-container'],
  },
  {
    id: 'zen',
    name: 'OpenEdu Zen',
    description: 'Reduced stimulation, quiet reading',
    swatches: ['surface', 'primary', 'on-surface', 'primary-container'],
  },
];

export interface ThemeSelectorProps {
  currentThemeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

export function ThemeSelector({ currentThemeId, onThemeChange }: ThemeSelectorProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<ThemeId | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wasOpen = useRef(isOpen);

  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const selectedIdx = themeInfo.findIndex((t) => t.id === currentThemeId);
      const focusIdx = selectedIdx >= 0 ? selectedIdx : 0;
      cardRefs.current[focusIdx]?.focus();
    }
  }, [isOpen, currentThemeId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }
    if (e.key === 'Tab') {
      const cards = cardRefs.current.filter(Boolean);
      if (cards.length === 0) return;
      const currentIdx = cardRefs.current.findIndex((ref) => ref === document.activeElement);
      e.preventDefault();
      if (currentIdx === -1) {
        if (e.shiftKey) {
          cards[cards.length - 1]?.focus();
        } else {
          cards[0]?.focus();
        }
        return;
      }
      const direction = e.shiftKey ? -1 : 1;
      const nextIdx = (currentIdx + direction + themeInfo.length) % themeInfo.length;
      cardRefs.current[nextIdx]?.focus();
    }
  };

  const handleSelect = (id: ThemeId) => {
    onThemeChange(id);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" data-testid="theme-selector">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Select theme"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="border-input bg-surface-container text-foreground flex size-10 cursor-pointer items-center justify-center rounded-md border transition-colors duration-200"
        data-testid="theme-selector-trigger"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.47 1.5-1.5 0-.38-.12-.7-.37-.96-.24-.25-.37-.58-.37-.96 0-.83.67-1.5 1.5-1.5H15c3.86 0 7-3.14 7-7 0-4.97-4.48-9-10-9z" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Theme selector"
          onKeyDown={handleKeyDown}
          className="border-outline-variant bg-surface-container-highest absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border p-3 shadow-md"
          data-testid="theme-selector-popover"
        >
          <div className="grid grid-cols-3 gap-2" role="listbox" aria-label="Select a theme">
            {themeInfo.map((theme, idx) => {
              const isSelected = currentThemeId === theme.id;
              const isHovered = hoveredId === theme.id;
              return (
                <button
                  key={theme.id}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(theme.id)}
                  className={`bg-surface-container text-foreground flex cursor-pointer flex-col gap-1.5 rounded-md border-2 p-2.5 text-left transition-colors duration-200 ${isSelected || isHovered ? 'border-primary' : 'border-transparent'}`}
                  onMouseEnter={() => setHoveredId(theme.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  data-testid={`theme-card-${theme.id}`}
                >
                  <div className="flex gap-1">
                    {theme.swatches.map((swatch, si) => (
                      <span
                        key={si}
                        className="inline-block size-4 rounded-full"
                        style={{ backgroundColor: `var(--oe-color-${swatch})` }}
                      />
                    ))}
                  </div>
                  <span className="text-body-ui font-medium leading-tight">{theme.name}</span>
                  <span className="text-surface-variant-foreground text-caption leading-tight">
                    {theme.description}
                  </span>
                  {isSelected && (
                    <span className="text-primary text-caption font-semibold" aria-label="Selected">
                      ✓ Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
