import { useState, useRef, useEffect } from 'react';
import type { ThemeId } from '../themes/types.js';

const themeInfo: Array<{ id: ThemeId; name: string; description: string; swatches: string[] }> = [
  {
    id: 'high-focus',
    name: 'High Focus',
    description: 'High contrast, minimal noise',
    swatches: ['#fcf8f9', '#003eb3', '#1b1b1c', '#046d3f'],
  },
  {
    id: 'lumina-scholastica',
    name: 'Lumina Scholastica',
    description: 'Modern minimalist learning',
    swatches: ['#fdf7ff', '#4f378a', '#1d1b20', '#63597c'],
  },
  {
    id: 'nocturnal',
    name: 'Nocturnal',
    description: 'Dark mode, deep focus',
    swatches: ['#151219', '#dab9ff', '#e8e0ea', '#46f5e0'],
  },
  {
    id: 'sylvan-workspace',
    name: 'Sylvan Workspace',
    description: 'Warm, organic reading',
    swatches: ['#f9faf6', '#061b0e', '#1a1c1a', '#536253'],
  },
  {
    id: 'zen',
    name: 'Zen',
    description: 'Minimalist light, reduced visual noise',
    swatches: ['#fafaf9', '#57534e', '#1c1917', '#72706e'],
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Earthy greens and warm browns',
    swatches: ['#f6f7f3', '#2d4a2c', '#1a1c1a', '#6b5b4a'],
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
        className="flex items-center justify-center w-10 h-10 rounded-md border border-input bg-surface-container text-foreground cursor-pointer transition-colors duration-200"
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
          className="absolute left-0 z-50 w-80 p-3 rounded-lg border border-outline-variant bg-surface-container-highest shadow-md"
          style={{ top: 'calc(100% + 8px)' }}
          data-testid="theme-selector-popover"
        >
          <div className="grid grid-cols-2 gap-2" role="listbox" aria-label="Select a theme">
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
                  className="flex flex-col gap-1.5 p-2.5 rounded-md bg-surface-container cursor-pointer text-left text-foreground transition-colors duration-200 border-2"
                  style={{
                    borderColor:
                      isSelected || isHovered ? 'var(--oe-color-primary)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredId(theme.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  data-testid={`theme-card-${theme.id}`}
                >
                  <div className="relative">
                    <div className="flex gap-1">
                      {theme.swatches.map((color, ci) => (
                        <div
                          key={ci}
                          className="w-4 h-4 rounded-sm border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold leading-tight">{theme.name}</div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    {theme.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

ThemeSelector.displayName = 'ThemeSelector';
