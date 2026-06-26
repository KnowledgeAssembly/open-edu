import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react';
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
];

export interface ThemeSelectorProps {
  currentThemeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

const triggerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  border: '1px solid var(--oe-color-border, #e5e7eb)',
  borderRadius: 'var(--oe-radius, 8px)',
  backgroundColor: 'var(--oe-color-surface-container, #f0edee)',
  color: 'var(--oe-color-fg, #1a1a1a)',
  cursor: 'pointer',
  transition: 'background-color 200ms ease',
};

const popoverStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 50,
  width: '320px',
  padding: '12px',
  backgroundColor: 'var(--oe-color-surface-container-highest, #e5e2e3)',
  border: '1px solid var(--oe-color-outline-variant, #c4c5d6)',
  borderRadius: 'var(--oe-radius-lg, 12px)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
};

const cardBaseStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '10px',
  border: '2px solid transparent',
  borderRadius: 'var(--oe-radius, 8px)',
  backgroundColor: 'var(--oe-color-surface-container, #f0edee)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 200ms ease, background-color 200ms ease',
  fontFamily: 'inherit',
  color: 'var(--oe-color-fg, #1a1a1a)',
};

const cardSelectedStyle: CSSProperties = {
  ...cardBaseStyle,
  borderColor: 'var(--oe-color-primary, #2563eb)',
};

const swatchRowStyle: CSSProperties = {
  display: 'flex',
  gap: '4px',
};

const swatchStyle = (color: string): CSSProperties => ({
  width: '16px',
  height: '16px',
  borderRadius: '3px',
  backgroundColor: color,
  border: '1px solid rgba(0,0,0,0.1)',
});

const cardNameStyle: CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  lineHeight: 1.2,
};

const cardDescStyle: CSSProperties = {
  fontSize: '0.6875rem',
  color: 'var(--oe-color-on-surface-variant, #434653)',
  lineHeight: 1.3,
};

const checkmarkStyle: CSSProperties = {
  position: 'absolute',
  top: '4px',
  right: '4px',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  backgroundColor: 'var(--oe-color-primary, #2563eb)',
  color: 'var(--oe-color-on-primary, #ffffff)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  fontWeight: 700,
  lineHeight: 1,
};

export function ThemeSelector({ currentThemeId, onThemeChange }: ThemeSelectorProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      const selectedIdx = themeInfo.findIndex((t) => t.id === currentThemeId);
      const focusIdx = selectedIdx >= 0 ? selectedIdx : 0;
      setTimeout(() => cardRefs.current[focusIdx]?.focus(), 0);
    }
  }, [isOpen, currentThemeId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'Tab') {
        const currentIdx = cardRefs.current.findIndex((ref) => ref === document.activeElement);
        if (currentIdx === -1) return;
        e.preventDefault();
        const direction = e.shiftKey ? -1 : 1;
        const nextIdx = (currentIdx + direction + themeInfo.length) % themeInfo.length;
        cardRefs.current[nextIdx]?.focus();
      }
    },
    [close],
  );

  const handleSelect = (id: ThemeId) => {
    onThemeChange(id);
    close();
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} data-testid="theme-selector">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Select theme"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        style={triggerStyle}
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
          style={popoverStyle}
          data-testid="theme-selector-popover"
        >
          <div style={gridStyle} role="listbox" aria-label="Select a theme">
            {themeInfo.map((theme, idx) => {
              const isSelected = currentThemeId === theme.id;
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
                  style={isSelected ? cardSelectedStyle : cardBaseStyle}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--oe-color-primary, #2563eb)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                  data-testid={`theme-card-${theme.id}`}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={swatchRowStyle}>
                      {theme.swatches.map((color, ci) => (
                        <div key={ci} style={swatchStyle(color)} />
                      ))}
                    </div>
                    {isSelected && (
                      <div style={checkmarkStyle}>
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
                  <div style={cardNameStyle}>{theme.name}</div>
                  <div style={cardDescStyle}>{theme.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
