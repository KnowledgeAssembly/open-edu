import { describe, it, expect } from 'vitest';
import { imageCompare } from './ImageCompare';

describe('ImageCompare widget', () => {
  it('has correct widget id', () => {
    expect(imageCompare.id).toBe('core.image-compare');
  });

  it('has a render function', () => {
    expect(typeof imageCompare.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(imageCompare.domain).toBe('core');
  });

  it('has learning intents', () => {
    expect(imageCompare.learningIntents).toContain('compare');
  });

  it('is experimental status', () => {
    expect(imageCompare.status).toBe('experimental');
  });
});
