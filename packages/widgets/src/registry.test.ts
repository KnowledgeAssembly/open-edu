import { describe, it, expect } from 'vitest';
import { createWidgetRegistry } from './registry';
import { WidgetRegistrationError } from './types';

describe('createWidgetRegistry', () => {
  it('registers a widget definition', () => {
    const registry = createWidgetRegistry();
    registry.register({ id: 'test', render: () => null });
    expect(registry.has('test')).toBe(true);
  });

  it('throws WidgetRegistrationError on duplicate registration', () => {
    const registry = createWidgetRegistry();
    registry.register({ id: 'test', render: () => null });
    expect(() => registry.register({ id: 'test', render: () => null })).toThrow(
      WidgetRegistrationError,
    );
  });

  it('get returns undefined for unregistered widget', () => {
    const registry = createWidgetRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('get returns the registered definition', () => {
    const registry = createWidgetRegistry();
    const def = { id: 'test', version: '1.0.0', render: () => null };
    registry.register(def);
    expect(registry.get('test')).toBe(def);
  });

  it('has returns false for unregistered widget', () => {
    const registry = createWidgetRegistry();
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('has returns true for registered widget', () => {
    const registry = createWidgetRegistry();
    registry.register({ id: 'test', render: () => null });
    expect(registry.has('test')).toBe(true);
  });
});
