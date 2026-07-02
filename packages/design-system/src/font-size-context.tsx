import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface FontSizeContextValue {
  fontSize: number;
  setFontSize: (value: number) => void;
  decreaseFontSize: () => void;
  increaseFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

const MIN_FONT_SIZE = 80;
const MAX_FONT_SIZE = 150;
const FONT_SIZE_STEP = 10;

const FONT_SIZE_VAR_RE = /^--oe-font-.+-size$/;

let baseFontSizes: Record<string, number> | null = null;

function getTargetEl(): HTMLElement {
  return document.querySelector('.open-edu-runtime') ?? document.documentElement;
}

function captureBaseFontSizes(): void {
  if (baseFontSizes) return;
  baseFontSizes = {};
  const el = getTargetEl();
  const style = getComputedStyle(el);
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i);
    if (FONT_SIZE_VAR_RE.test(name)) {
      const raw = style.getPropertyValue(name);
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        baseFontSizes[name] = num;
      }
    }
  }
}

function applyFontSizeScale(scale: number): void {
  captureBaseFontSizes();
  if (Object.keys(baseFontSizes!).length === 0) return;
  const el = getTargetEl();
  for (const [name, base] of Object.entries(baseFontSizes!)) {
    el.style.setProperty(name, `${(base * scale) / 100}px`);
  }
}

export function FontSizeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [fontSize, setFontSizeState] = useState(100);

  useEffect(() => {
    applyFontSizeScale(fontSize);
  }, [fontSize]);

  const setFontSize = (value: number) => {
    setFontSizeState(Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, value)));
  };

  const decreaseFontSize = () => setFontSize(fontSize - FONT_SIZE_STEP);
  const increaseFontSize = () => setFontSize(fontSize + FONT_SIZE_STEP);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, decreaseFontSize, increaseFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize(): FontSizeContextValue {
  const ctx = useContext(FontSizeContext);
  if (!ctx) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return ctx;
}