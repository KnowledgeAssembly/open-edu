import { describe, it, expect } from 'vitest';
import { layoutTokens, layoutTokenToCssVar, tailwindLayoutExtensions } from '../layout';

describe('layout tokens', () => {
  it('defines sidebar width', () => {
    expect(layoutTokens['sidebar-width']).toBe('280px');
  });

  it('defines header height', () => {
    expect(layoutTokens['header-height']).toBe('56px');
  });

  it('defines reading width', () => {
    expect(layoutTokens['reading-width']).toBe('680px');
  });

  it('generates CSS var references', () => {
    expect(layoutTokenToCssVar('sidebar-width')).toBe('var(--oe-layout-sidebar-width)');
  });

  it('tailwind extensions map correctly', () => {
    expect(tailwindLayoutExtensions['sidebar-width']).toBe('280px');
  });
});
