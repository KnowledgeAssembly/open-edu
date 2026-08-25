export function applyThemeTokens(root: HTMLElement, tokens: Record<string, string>): void {
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`--oe-widget-${key}`, value);
  }
}
