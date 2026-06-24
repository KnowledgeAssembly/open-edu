import { describe, it, expect } from 'vitest';
import {
  WIDGETS_VERSION,
  createWidgetRegistry,
  WidgetRegistrationError,
  multipleChoicePractice,
  visualCounting,
  registerAllBuiltins,
  createDefaultRegistry,
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

  it('should export visualCounting widget', () => {
    expect(visualCounting.id).toBe('open-edu.visual-counting');
    expect(visualCounting.render).toBeInstanceOf(Function);
  });

  it('should export registerAllBuiltins and register all widgets', () => {
    const registry = createWidgetRegistry();
    registerAllBuiltins(registry);
    expect(registry.has('open-edu.visual-counting')).toBe(true);
    expect(registry.has('open-edu.multiple-choice')).toBe(true);
    expect(registry.has('open-edu.matching')).toBe(true);
    expect(registry.has('open-edu.drag-drop')).toBe(true);
    expect(registry.has('open-edu.sequencing')).toBe(true);
    expect(registry.has('open-edu.fill-blank')).toBe(true);
    expect(registry.has('open-edu.story-question')).toBe(true);
    expect(registry.has('open-edu.real-world')).toBe(true);
    expect(registry.has('open-edu.fraction-visual')).toBe(true);
    expect(registry.has('open-edu.place-value-chart')).toBe(true);
    expect(registry.has('open-edu.grid-area')).toBe(true);
    expect(registry.has('open-edu.chart-reader')).toBe(true);
    expect(registry.has('open-edu.clock-time')).toBe(true);
    expect(registry.has('open-edu.measurement-scale')).toBe(true);
  });

  it('should export createDefaultRegistry with all widgets registered', () => {
    const registry = createDefaultRegistry();
    expect(registry.get('open-edu.visual-counting')).toBeDefined();
    expect(registry.get('open-edu.multiple-choice')).toBeDefined();
  });
});
