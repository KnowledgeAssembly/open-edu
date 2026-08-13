import { describe, it, expect } from 'vitest';
import { truncateExcerpt, buildOutlineSummary } from './context';

describe('Studio Context Helpers', () => {
  describe('truncateExcerpt', () => {
    it('does not truncate short text', () => {
      const text = 'Hello world';
      expect(truncateExcerpt(text)).toBe(text);
    });

    it('truncates long text and adds suffix', () => {
      const text = 'a'.repeat(5000);
      const result = truncateExcerpt(text, 100);
      expect(result).toContain('... [truncated]');
      expect(result.length).toBeGreaterThan(100);
    });
  });

  describe('buildOutlineSummary', () => {
    it('summarizes activities and caps the list', () => {
      const activities = Array.from({ length: 50 }, (_, i) => ({
        title: `Act ${i}`,
        kind: 'lesson',
        path: `/path/${i}`,
        extra: 'should be removed',
      }));

      const result = buildOutlineSummary(activities, 30);
      expect(result).toHaveLength(30);
      expect(result[0]).toEqual({
        title: 'Act 0',
        kind: 'lesson',
        path: '/path/0',
      });
      expect(result[0]).not.toHaveProperty('extra');
    });

    it('handles missing titles or kinds', () => {
      const activities = [{ path: '/path/1' }];
      const result = buildOutlineSummary(activities);
      expect(result[0]).toEqual({
        title: 'Untitled',
        kind: 'other',
        path: '/path/1',
      });
    });
  });
});
