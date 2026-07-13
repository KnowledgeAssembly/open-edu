import { describe, it, expect } from 'vitest';
import { timeline } from './Timeline';

describe('Timeline widget', () => {
  it('has correct widget id', () => {
    expect(timeline.id).toBe('core.timeline');
  });

  it('has a render function', () => {
    expect(typeof timeline.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(timeline.domain).toBe('core');
  });

  it('has learning intents', () => {
    expect(timeline.learningIntents).toContain('apply');
  });

  it('is experimental status', () => {
    expect(timeline.status).toBe('experimental');
  });
});
