import { describe, it, expect } from 'vitest';
import { getFileCategory } from './packageFileCategory';

describe('getFileCategory', () => {
  it('labels manifest, workflow, rewards, and cards files', () => {
    expect(getFileCategory('package.json')).toBe('manifest');
    expect(getFileCategory('workflow.json')).toBe('workflow');
    expect(getFileCategory('rewards.json')).toBe('rewards');
    expect(getFileCategory('cards.json')).toBe('cards');
  });

  it('labels node and asset files by folder', () => {
    expect(getFileCategory('nodes/a.md')).toBe('nodes');
    expect(getFileCategory('assets/x.png')).toBe('assets');
  });

  it('labels anything else as other', () => {
    expect(getFileCategory('foo.txt')).toBe('other');
  });
});
