import { describe, it, expect } from 'vitest';
import { createDefaultRegistry } from '../index';
import type { WidgetDefinitionV2 } from '../types';

describe('Widget metadata enrichment', () => {
  const registry = createDefaultRegistry();
  const allWidgets = registry.getAll().map((w) => w as unknown as WidgetDefinitionV2);
  const stableWidgets = allWidgets.filter((w) => w.status === 'stable');

  describe('AI metadata completeness', () => {
    it('all stable widgets have recommendedAge', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.recommendedAge, `${w.id} missing recommendedAge`).toBeDefined();
        expect(w.ai?.recommendedAge).toHaveLength(2);
      }
    });

    it('all stable widgets have readingLevel', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.readingLevel, `${w.id} missing readingLevel`).toBeDefined();
      }
    });

    it('all stable widgets have learningObjectives', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.learningObjectives, `${w.id} missing learningObjectives`).toBeDefined();
        expect(w.ai!.learningObjectives!.length).toBeGreaterThan(0);
      }
    });

    it('all stable widgets have commonMisconceptions', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.commonMisconceptions, `${w.id} missing commonMisconceptions`).toBeDefined();
        expect(w.ai!.commonMisconceptions!.length).toBeGreaterThan(0);
      }
    });

    it('all stable widgets have generationHints', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.generationHints, `${w.id} missing generationHints`).toBeDefined();
        expect(w.ai!.generationHints!.length).toBeGreaterThan(0);
      }
    });

    it('all stable widgets have exampleConfigs', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.exampleConfigs, `${w.id} missing exampleConfigs`).toBeDefined();
        expect(w.ai!.exampleConfigs!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Capabilities completeness', () => {
    it('all stable widgets declare supportsObserveMode', () => {
      for (const w of stableWidgets) {
        expect(w.capabilities.supportsObserveMode, `${w.id} missing supportsObserveMode`).toBe(
          true,
        );
      }
    });
  });

  describe('Analytics completeness', () => {
    it('all stable widgets with supportsHints declare trackHints', () => {
      for (const w of stableWidgets) {
        if (w.capabilities.supportsHints) {
          expect(w.analytics.trackHints, `${w.id} has supportsHints but no trackHints`).toBe(true);
        }
      }
    });

    it('all stable widgets with supportsRetry declare trackRetries', () => {
      for (const w of stableWidgets) {
        if (w.capabilities.supportsRetry) {
          expect(w.analytics.trackRetries, `${w.id} has supportsRetry but no trackRetries`).toBe(
            true,
          );
        }
      }
    });
  });

  describe('Reward completeness', () => {
    it('at least one widget declares positiveMessage', () => {
      const withMessage = stableWidgets.filter((w) => w.reward?.positiveMessage);
      expect(withMessage.length).toBeGreaterThan(0);
    });

    it('all stable widgets declare achievement', () => {
      for (const w of stableWidgets) {
        expect(w.reward?.achievement, `${w.id} missing achievement`).toBeDefined();
      }
    });
  });
});
