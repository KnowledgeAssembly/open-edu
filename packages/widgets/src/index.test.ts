import { describe, it, expect } from 'vitest';
import {
  WIDGETS_VERSION,
  createWidgetRegistry,
  WidgetRegistrationError,
  multipleChoicePractice,
} from './index';

describe('@open-edu/widgets', () => {
  it('should export a version', () => {
    expect(WIDGETS_VERSION).toBe('0.1.0');
  });

  it('should export createWidgetRegistry', () => {
    const registry = createWidgetRegistry();
    expect(registry).toBeDefined();
    expect(registry.register).toBeInstanceOf(Function);
    expect(registry.get).toBeInstanceOf(Function);
    expect(registry.has).toBeInstanceOf(Function);
  });

  it('should export WidgetRegistrationError', () => {
    const error = new WidgetRegistrationError('test');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('WidgetRegistrationError');
    expect(error.message).toContain('test');
  });

  it('should export multipleChoicePractice widget', () => {
    expect(multipleChoicePractice.id).toBe('open-edu.multiple-choice-practice');
    expect(multipleChoicePractice.render).toBeInstanceOf(Function);
  });
});
