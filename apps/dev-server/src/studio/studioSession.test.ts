import { describe, it, expect, beforeEach } from 'vitest';
import {
  readStudioView,
  writeStudioView,
  readSelectedPath,
  writeSelectedPath,
  readOutlineTab,
  writeOutlineTab,
  readFilesPath,
  writeFilesPath,
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

  it('persists the library and unit-builder views', () => {
    writeStudioView('library');
    expect(readStudioView()).toBe('library');
    writeStudioView('unit-builder');
    expect(readStudioView()).toBe('unit-builder');
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

  it('defaults to the outline tab', () => {
    expect(readOutlineTab()).toBe('outline');
  });

  it('persists and restores the outline tab', () => {
    writeOutlineTab('files');
    expect(readOutlineTab()).toBe('files');
  });

  it('ignores invalid stored outline tabs', () => {
    sessionStorage.setItem('openedu.studio.outlineTab', 'nope');
    expect(readOutlineTab()).toBe('outline');
  });

  it('persists and restores the files path', () => {
    expect(readFilesPath()).toBeNull();
    writeFilesPath('nodes/lesson.md');
    expect(readFilesPath()).toBe('nodes/lesson.md');
    writeFilesPath(null);
    expect(readFilesPath()).toBeNull();
  });
});
