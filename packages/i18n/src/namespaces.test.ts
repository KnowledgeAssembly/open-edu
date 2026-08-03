import { describe, it, expect } from 'vitest';
import { NAMESPACES, type Namespace } from './namespaces.js';

describe('namespaces', () => {
  it('includes runtime namespace', () => {
    expect(NAMESPACES).toContain('runtime');
  });

  it('includes learner namespace', () => {
    expect(NAMESPACES).toContain('learner');
  });

  it('includes widgets namespace', () => {
    expect(NAMESPACES).toContain('widgets');
  });

  it('includes schemas namespace', () => {
    expect(NAMESPACES).toContain('schemas');
  });

  it('includes website namespace', () => {
    expect(NAMESPACES).toContain('website');
  });

  it('is a typed const array', () => {
    const ns: Namespace = 'runtime';
    expect(NAMESPACES).toContain(ns);
  });
});
