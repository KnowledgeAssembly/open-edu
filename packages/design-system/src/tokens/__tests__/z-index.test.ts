import { describe, it, expect } from 'vitest';
import { zIndexScale } from '../z-index.js';

describe('z-index tokens', () => {
  it('exports z-index values in correct order', () => {
    expect(zIndexScale.dropdown).toBe(50);
    expect(zIndexScale.sticky).toBe(100);
    expect(zIndexScale.modal).toBe(200);
    expect(zIndexScale.popover).toBe(300);
    expect(zIndexScale.tooltip).toBe(400);
    expect(zIndexScale.toast).toBe(500);
  });

  it('values are ordered hierarchically', () => {
    expect(zIndexScale.dropdown).toBeLessThan(zIndexScale.sticky);
    expect(zIndexScale.sticky).toBeLessThan(zIndexScale.modal);
    expect(zIndexScale.modal).toBeLessThan(zIndexScale.popover);
    expect(zIndexScale.popover).toBeLessThan(zIndexScale.toast);
  });
});
