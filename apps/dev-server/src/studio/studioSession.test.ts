import { describe, it, expect, beforeEach } from 'vitest';
import {
  readStudioView,
  writeStudioView,
  readSelectedPath,
  writeSelectedPath,
} from './studioSession';

describe('studioSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('defaults to home view', () => {
    expect(readStudioView()).toBe('home');
  });

  it('persists and restores the view', () => {
    writeStudioView('outline');
    expect(readStudioView()).toBe('outline');
  });

  it('ignores invalid stored views', () => {
    sessionStorage.setItem('openedu.studio.view', 'nope');
    expect(readStudioView()).toBe('home');
  });

  it('persists and restores the selected path', () => {
    expect(readSelectedPath()).toBeNull();
    writeSelectedPath('nodes/lesson.md');
    expect(readSelectedPath()).toBe('nodes/lesson.md');
  });
});
