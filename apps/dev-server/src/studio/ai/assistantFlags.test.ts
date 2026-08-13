import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAssistantEnabled } from './assistantFlags';

describe('isAssistantEnabled', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_ASSISTANT;
  });

  afterEach(() => {
    localStorage.clear();
    delete (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_ASSISTANT;
  });

  it('defaults to on', () => {
    expect(isAssistantEnabled()).toBe(true);
  });

  it('respects OPEN_EDU_STUDIO_ASSISTANT=0', () => {
    (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_ASSISTANT = '0';
    expect(isAssistantEnabled()).toBe(false);
  });

  it('localStorage true overrides env off', () => {
    (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_ASSISTANT = '0';
    localStorage.setItem('openedu.studio.assistant.enabled', 'true');
    expect(isAssistantEnabled()).toBe(true);
  });

  it('localStorage false overrides default on', () => {
    localStorage.setItem('openedu.studio.assistant.enabled', 'false');
    expect(isAssistantEnabled()).toBe(false);
  });
});
