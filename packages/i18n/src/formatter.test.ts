import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber, formatPercent, formatCurrency } from './formatter.js';

describe('formatDate', () => {
  it('formats a date in English', () => {
    const date = new Date(2026, 0, 15); // Jan 15, 2026
    const result = formatDate(date, 'en', { dateStyle: 'medium' });
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });

  it('formats a date in Hindi', () => {
    const date = new Date(2026, 0, 15);
    const result = formatDate(date, 'hi');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatNumber', () => {
  it('formats 100000 in English', () => {
    const result = formatNumber(100000, 'en');
    // English uses standard grouping: 100,000
    expect(result).toBe('100,000');
  });

  it('formats 100000 in Hindi (Indian grouping)', () => {
    const result = formatNumber(100000, 'hi');
    // Hindi uses Indian grouping: 1,00,000
    expect(result).toBe('1,00,000');
  });
});

describe('formatPercent', () => {
  it('formats 0.85 in English', () => {
    const result = formatPercent(0.85, 'en');
    expect(result).toBe('85%');
  });

  it('formats 0.85 in Hindi', () => {
    const result = formatPercent(0.85, 'hi');
    expect(result).toContain('85');
  });
});

describe('formatCurrency', () => {
  it('formats currency in INR for Hindi', () => {
    const result = formatCurrency(1000, 'hi', 'INR');
    expect(result).toContain('1');
    expect(result).toContain('000');
  });

  it('formats currency in USD for English', () => {
    const result = formatCurrency(1000, 'en', 'USD');
    expect(result).toContain('1');
    expect(result).toContain('000');
  });
});
