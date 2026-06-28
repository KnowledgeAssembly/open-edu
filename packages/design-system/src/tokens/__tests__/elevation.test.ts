import { describe, it, expect } from 'vitest';
import { elevationScale } from '../elevation.js';

describe('elevation tokens', () => {
  it('exports all elevation levels', () => {
    expect(elevationScale['flat']).toBeDefined();
    expect(elevationScale['raised']).toBeDefined();
    expect(elevationScale['overlay']).toBeDefined();
    expect(elevationScale['modal']).toBeDefined();
    expect(elevationScale['sticky']).toBeDefined();
  });

  it('flat elevation has no shadow', () => {
    expect(elevationScale['flat']?.boxShadow).toBe('none');
  });
});
