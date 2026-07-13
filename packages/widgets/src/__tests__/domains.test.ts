import { describe, it, expect } from 'vitest';
import {
  WidgetDomain,
  WIDGET_ALIAS_MAP,
  resolveWidgetId,
  migrateWidgetId,
  getDomainPrefix,
} from '../domains';

describe('Widget Domains', () => {
  it('defines all domain constants', () => {
    expect(WidgetDomain.Core).toBe('core');
    expect(WidgetDomain.Math).toBe('math');
    expect(WidgetDomain.Language).toBe('language');
    expect(WidgetDomain.Science).toBe('science');
    expect(WidgetDomain.Social).toBe('social');
  });

  it('maps all legacy IDs to new IDs', () => {
    expect(WIDGET_ALIAS_MAP['open-edu.matching']).toBe('core.matching');
    expect(WIDGET_ALIAS_MAP['open-edu.multiple-choice']).toBe('core.multiple-choice');
    expect(WIDGET_ALIAS_MAP['open-edu.multiple-choice-practice']).toBe('core.multiple-choice');
    expect(WIDGET_ALIAS_MAP['open-edu.visual-counting']).toBe('core.visual-counting');
    expect(WIDGET_ALIAS_MAP['open-edu.drag-drop']).toBe('core.drag-drop');
    expect(WIDGET_ALIAS_MAP['open-edu.sequencing']).toBe('core.sequencing');
    expect(WIDGET_ALIAS_MAP['open-edu.fill-blank']).toBe('core.fill-blank');
    expect(WIDGET_ALIAS_MAP['open-edu.story-question']).toBe('core.story-question');
    expect(WIDGET_ALIAS_MAP['open-edu.real-world']).toBe('core.real-world');
    expect(WIDGET_ALIAS_MAP['open-edu.fraction-visual']).toBe('math.fraction-visual');
    expect(WIDGET_ALIAS_MAP['open-edu.place-value-chart']).toBe('math.place-value-chart');
    expect(WIDGET_ALIAS_MAP['open-edu.grid-area']).toBe('math.grid-area');
    expect(WIDGET_ALIAS_MAP['open-edu.chart-reader']).toBe('core.chart-reader');
    expect(WIDGET_ALIAS_MAP['open-edu.clock-time']).toBe('math.clock-time');
    expect(WIDGET_ALIAS_MAP['open-edu.measurement-scale']).toBe('math.measurement-scale');
  });

  it('resolveWidgetId returns new ID for legacy input', () => {
    expect(resolveWidgetId('open-edu.matching')).toBe('core.matching');
    expect(resolveWidgetId('open-edu.multiple-choice')).toBe('core.multiple-choice');
  });

  it('resolveWidgetId returns ID unchanged if not in alias map', () => {
    expect(resolveWidgetId('core.matching')).toBe('core.matching');
    expect(resolveWidgetId('unknown.widget')).toBe('unknown.widget');
  });

  it('migrateWidgetId returns migration info', () => {
    const result = migrateWidgetId('open-edu.matching');
    expect(result.oldId).toBe('open-edu.matching');
    expect(result.newId).toBe('core.matching');
    expect(result.migrated).toBe(true);
  });

  it('migrateWidgetId returns non-migrated for unknown IDs', () => {
    const result = migrateWidgetId('core.matching');
    expect(result.oldId).toBe('core.matching');
    expect(result.newId).toBe('core.matching');
    expect(result.migrated).toBe(false);
  });

  it('getDomainPrefix extracts domain from widget ID', () => {
    expect(getDomainPrefix('core.matching')).toBe('core');
    expect(getDomainPrefix('math.fraction-visual')).toBe('math');
    expect(getDomainPrefix('science.label-diagram')).toBe('science');
    expect(getDomainPrefix('unknown')).toBe('');
  });
});
