import { describe, it, expect } from 'vitest';
import { hotspot } from './Hotspot';

describe('Hotspot widget', () => {
  it('has correct widget id', () => {
    expect(hotspot.id).toBe('core.hotspot');
  });

  it('has a render function', () => {
    expect(typeof hotspot.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(hotspot.domain).toBe('core');
  });

  it('has learning intents', () => {
    expect(hotspot.learningIntents).toContain('explore');
  });

  it('is experimental status', () => {
    expect(hotspot.status).toBe('experimental');
  });
});
