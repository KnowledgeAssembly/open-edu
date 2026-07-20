import { describe, it, expect, beforeEach } from 'vitest';
import { TranslationEngine } from './engine.js';

describe('TranslationEngine', () => {
  let engine: TranslationEngine;

  beforeEach(() => {
    engine = new TranslationEngine({
      locales: ['en', 'hi'],
      fallbackLocale: 'en',
    });
  });

  describe('loadNamespace', () => {
    it('loads a namespace for a locale', () => {
      engine.loadNamespace('runtime', 'en', {
        'loading': 'Loading…',
        'quiz.submit': 'Submit',
      });
      expect(engine.t('runtime.loading', 'en')).toBe('Loading…');
    });

    it('overwrites existing namespace data', () => {
      engine.loadNamespace('runtime', 'en', { 'a': 'old' });
      engine.loadNamespace('runtime', 'en', { 'a': 'new' });
      expect(engine.t('runtime.a', 'en')).toBe('new');
    });
  });

  describe('t() — basic translation', () => {
    beforeEach(() => {
      engine.loadNamespace('runtime', 'en', {
        'loading': 'Loading…',
        'quiz.submit': 'Submit',
        'quiz.correct': 'Correct! Well done.',
        'quiz.incorrect': 'Incorrect. The correct answer is highlighted.',
      });
      engine.loadNamespace('runtime', 'hi', {
        'loading': 'लोड हो रहा है…',
        'quiz.submit': 'जमा करें',
      });
    });

    it('translates a simple key', () => {
      expect(engine.t('runtime.loading', 'en')).toBe('Loading…');
      expect(engine.t('runtime.loading', 'hi')).toBe('लोड हो रहा है…');
    });

    it('translates a nested key with dot notation', () => {
      expect(engine.t('runtime.quiz.submit', 'en')).toBe('Submit');
    });

    it('returns the key path when translation is missing', () => {
      expect(engine.t('runtime.quiz.missing', 'en')).toBe('runtime.quiz.missing');
    });

    it('returns the key path when namespace is missing', () => {
      expect(engine.t('unknown.key', 'en')).toBe('unknown.key');
    });
  });

  describe('t() — fallback', () => {
    beforeEach(() => {
      engine.loadNamespace('runtime', 'en', {
        'loading': 'Loading…',
        'quiz.submit': 'Submit',
      });
      engine.loadNamespace('runtime', 'hi', {
        'loading': 'लोड हो रहा है…',
      });
    });

    it('falls back to English when locale translation is missing', () => {
      expect(engine.t('runtime.quiz.submit', 'hi')).toBe('Submit');
    });

    it('does not fall back when translation exists in requested locale', () => {
      expect(engine.t('runtime.loading', 'hi')).toBe('लोड हो रहा है…');
    });
  });

  describe('t() — interpolation', () => {
    beforeEach(() => {
      engine.loadNamespace('learner', 'en', {
        'welcome': 'Welcome {{name}}',
        'progress': '{{current}} of {{total}} completed',
      });
    });

    it('interpolates a single parameter', () => {
      expect(engine.t('learner.welcome', 'en', { name: 'Arin' })).toBe('Welcome Arin');
    });

    it('interpolates multiple parameters', () => {
      expect(engine.t('learner.progress', 'en', { current: '3', total: '10' })).toBe('3 of 10 completed');
    });

    it('returns key with missing params as literal', () => {
      expect(engine.t('learner.welcome', 'en')).toBe('Welcome {{name}}');
    });
  });

  describe('t() — locale override', () => {
    beforeEach(() => {
      engine.loadNamespace('runtime', 'en', { 'a': 'English' });
      engine.loadNamespace('runtime', 'hi', { 'a': 'Hindi' });
    });

    it('uses the override locale instead of the engine default', () => {
      expect(engine.t('runtime.a', 'hi')).toBe('Hindi');
    });
  });

  describe('missing translation callback', () => {
    it('calls the onMissing callback for missing keys', () => {
      const missing: Array<{ key: string; locale: string }> = [];
      engine = new TranslationEngine({
        locales: ['en'],
        fallbackLocale: 'en',
        onMissing: (key, locale) => missing.push({ key, locale }),
      });
      engine.t('runtime.missing.key', 'en');
      expect(missing).toEqual([{ key: 'runtime.missing.key', locale: 'en' }]);
    });

    it('does not call onMissing for present keys', () => {
      const missing: Array<{ key: string; locale: string }> = [];
      engine = new TranslationEngine({
        locales: ['en'],
        fallbackLocale: 'en',
        onMissing: (key, locale) => missing.push({ key, locale }),
      });
      engine.loadNamespace('runtime', 'en', { 'a': 'ok' });
      engine.t('runtime.a', 'en');
      expect(missing).toEqual([]);
    });
  });

  describe('hasNamespace', () => {
    it('returns true for loaded namespaces', () => {
      engine.loadNamespace('runtime', 'en', {});
      expect(engine.hasNamespace('runtime', 'en')).toBe(true);
    });

    it('returns false for unloaded namespaces', () => {
      expect(engine.hasNamespace('runtime', 'en')).toBe(false);
    });
  });

  describe('getLoadedNamespaces', () => {
    it('returns loaded namespace names for a locale', () => {
      engine.loadNamespace('runtime', 'en', {});
      engine.loadNamespace('learner', 'en', {});
      expect(engine.getLoadedNamespaces('en')).toEqual(['runtime', 'learner']);
    });
  });
});
