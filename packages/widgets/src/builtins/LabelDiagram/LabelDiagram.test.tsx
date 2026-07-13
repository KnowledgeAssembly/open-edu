import { describe, it, expect } from 'vitest';
import { labelDiagram } from './LabelDiagram';

describe('LabelDiagram widget', () => {
  it('has correct widget id', () => {
    expect(labelDiagram.id).toBe('science.label-diagram');
  });

  it('has a render function', () => {
    expect(typeof labelDiagram.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(labelDiagram.domain).toBe('science');
  });

  it('has learning intents', () => {
    expect(labelDiagram.learningIntents).toContain('apply');
  });

  it('is experimental status', () => {
    expect(labelDiagram.status).toBe('experimental');
  });
});
