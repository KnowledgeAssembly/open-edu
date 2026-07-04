export const a11yOverridesCss = `
.open-edu-runtime {
  @media (prefers-contrast: more) {
    --oe-color-outline: #000000;
    --oe-color-outline-variant: #1a1a1a;
    --oe-border-width-sm: 2px;
    --oe-border-width-DEFAULT: 2px;
    --oe-border-width-md: 3px;
    --oe-focus-ring-width: 3px;
    --oe-focus-ring-offset: 3px;
  }

  @media (forced-colors: active) {
    --oe-color-primary: Highlight;
    --oe-color-on-primary: HighlightText;
    --oe-color-surface: Canvas;
    --oe-color-on-surface: CanvasText;
    --oe-color-surface-container: Canvas;
    --oe-color-surface-container-high: Canvas;
    --oe-color-surface-container-highest: Canvas;
    --oe-color-surface-container-low: Canvas;
    --oe-color-surface-container-lowest: Canvas;
    --oe-color-surface-bright: Canvas;
    --oe-color-surface-dim: Canvas;
    --oe-color-on-surface-variant: CanvasText;
    --oe-color-inverse-surface: CanvasText;
    --oe-color-inverse-on-surface: Canvas;
    --oe-color-outline: CanvasText;
    --oe-color-outline-variant: CanvasText;
    --oe-color-background: Canvas;
    --oe-color-on-background: CanvasText;
    --oe-color-border: CanvasText;
    --oe-color-success: CanvasText;
    --oe-color-error: CanvasText;
    --oe-color-accent: CanvasText;
    --oe-color-primary-light: Highlight;
    --oe-focus-ring-color: Highlight;
  }
}
`;
