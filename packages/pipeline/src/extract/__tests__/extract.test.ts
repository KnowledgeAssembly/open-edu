import { describe, it, expect, vi } from 'vitest';
import { extractTextFromPDF, extractPDFPages } from '../index.js';

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({
    text: [
      'Sample Text',
      'Chapter 1: Numbers',
      '1.1 Whole Numbers',
      'Example: Count objects',
      'Exercise: Practice problems',
      'Chapter 2: Addition',
    ].join('\n'),
    info: { Title: 'Test Book' },
    numpages: 10,
  }),
}));

describe('extractPDF', () => {
  it('rejects non-PDF files', async () => {
    await expect(extractTextFromPDF('test.txt')).rejects.toThrow('Not a PDF file');
  });

  it('rejects missing files', async () => {
    await expect(extractTextFromPDF('/nonexistent/test.pdf')).rejects.toThrow();
  });
});

describe('parseChapters', () => {
  const CHAPTER_HEADING = /^(Lesson|Chapter|Unit)\s+(\d+)\s*[:\-–—]\s*(.+)$/im;

  it('matches chapter headings', () => {
    const match = 'Chapter 1: Numbers'.match(CHAPTER_HEADING);
    expect(match).not.toBeNull();
    expect(match![2]).toBe('1');
    expect(match![3]).toBe('Numbers');
  });

  it('matches Lesson headings', () => {
    const match = 'Lesson 2 - Addition'.match(CHAPTER_HEADING);
    expect(match).not.toBeNull();
    expect(match![2]).toBe('2');
  });

  it('rejects non-existent PDF with extractPDFPages', async () => {
    await expect(extractPDFPages('/nonexistent/file.pdf')).rejects.toThrow();
  });

  it('matches Unit headings', () => {
    const match = 'Unit 3 — Geometry'.match(CHAPTER_HEADING);
    expect(match).not.toBeNull();
    expect(match![2]).toBe('3');
  });
});
