import { describe, it, expect } from 'vitest';
import { applyThemeTokens } from './theme';

describe('applyThemeTokens', () => {
  it('maps token keys onto the --oe-widget-* CSS variables', () => {
    applyThemeTokens(document.body, { primary: '#123456', 'x-y': '1rem' });
    expect(document.body.style.getPropertyValue('--oe-widget-primary')).toBe('#123456');
    expect(document.body.style.getPropertyValue('--oe-widget-x-y')).toBe('1rem');
  });

  it('is a no-op for an empty tokens object', () => {
    applyThemeTokens(document.body, { primary: '#123456' });
    document.body.removeAttribute('style');
    applyThemeTokens(document.body, {});
    expect(document.body.getAttribute('style')).toBeNull();
  });
});
