import { describe, it, expect } from 'vitest';
import { imageLabel } from './ImageLabel';

describe('ImageLabel widget', () => {
  it('has correct widget id', () => {
    expect(imageLabel.id).toBe('science.image-label');
  });

  it('has a render function', () => {
    expect(typeof imageLabel.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(imageLabel.domain).toBe('science');
  });

  it('has learning intents', () => {
    expect(imageLabel.learningIntents).toContain('observe');
  });

  it('is experimental status', () => {
    expect(imageLabel.status).toBe('experimental');
  });
});
