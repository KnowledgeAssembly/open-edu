import { describe, it, expect } from 'vitest';
import { callout } from './Callout';

describe('Callout widget', () => {
  it('has correct widget id', () => {
    expect(callout.id).toBe('core.callout');
  });

  it('has a render function', () => {
    expect(typeof callout.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(callout.domain).toBe('core');
  });

  it('has learning intents', () => {
    expect(callout.learningIntents).toContain('observe');
  });

  it('is experimental status', () => {
    expect(callout.status).toBe('experimental');
  });
});
