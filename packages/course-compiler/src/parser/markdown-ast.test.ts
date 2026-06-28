import { describe, it, expect } from 'vitest';
import { parseMarkdown, findHeading, getSectionContent, extractHeadingText, serializeContentToMarkdown } from './markdown-ast.js';

describe('parseMarkdown', () => {
  it('parses basic markdown with frontmatter', () => {
    const md = `---
title: Test Course
description: A test
---

# Module 1

Hello world
`;
    const result = parseMarkdown(md);
    expect(result.frontmatter).toEqual({ title: 'Test Course', description: 'A test' });
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe('root');
  });

  it('returns empty frontmatter when no frontmatter present', () => {
    const md = '# Just a heading\n\nSome content';
    const result = parseMarkdown(md);
    expect(result.frontmatter).toEqual({});
  });

  it('returns empty frontmatter for empty string', () => {
    const result = parseMarkdown('');
    expect(result.frontmatter).toEqual({});
    expect(result.ast.children).toHaveLength(0);
  });

  it('handles malformed frontmatter gracefully', () => {
    const md = '---\n: invalid yaml\n---\n\n# Content';
    const result = parseMarkdown(md);
    expect(result.frontmatter).toEqual({});
  });

  it('parses frontmatter with array values', () => {
    const md = `---
keywords: ["math", "algebra"]
---
`;
    const result = parseMarkdown(md);
    expect(result.frontmatter.keywords).toEqual(['math', 'algebra']);
  });

  it('parses frontmatter with boolean values', () => {
    const md = `---
published: true
draft: false
---
`;
    const result = parseMarkdown(md);
    expect(result.frontmatter.published).toBe(true);
    expect(result.frontmatter.draft).toBe(false);
  });

  it('preserves position context on AST nodes', () => {
    const md = '# Hello\n\nWorld';
    const result = parseMarkdown(md);
    const heading = result.ast.children[0];
    expect(heading).toBeDefined();
    expect(heading!.type).toBe('heading');
    expect(heading!.position).toBeDefined();
  });
});

describe('findHeading', () => {
  it('finds heading by depth', () => {
    const md = '## Sub\n\n# Main\n\nContent';
    const { ast } = parseMarkdown(md);
    const heading = findHeading(ast, 1);
    expect(heading).toBeDefined();
    expect(extractHeadingText(heading!)).toBe('Main');
  });

  it('finds heading by depth and text', () => {
    const md = '# Module 1\n\n# Module 2\n\n# Module 3';
    const { ast } = parseMarkdown(md);
    const heading = findHeading(ast, 1, 'Module 2');
    expect(heading).toBeDefined();
  });

  it('returns undefined when heading not found', () => {
    const md = '## Only H2';
    const { ast } = parseMarkdown(md);
    expect(findHeading(ast, 1)).toBeUndefined();
  });
});

describe('getSectionContent', () => {
  it('returns content between headings at same level', () => {
    const md = '# Section 1\n\nContent A\n\n* List item\n\n# Section 2\n\nContent B';
    const { ast } = parseMarkdown(md);
    const content = getSectionContent(ast, 0);
    expect(content.length).toBeGreaterThanOrEqual(2);
    expect(serializeContentToMarkdown(content)).toContain('Content A');
    expect(serializeContentToMarkdown(content)).toContain('List item');
  });

  it('returns content until end when no sibling heading', () => {
    const md = '# Section 1\n\nContent A\n\n## Subsection\n\nDetail';
    const { ast } = parseMarkdown(md);
    const content = getSectionContent(ast, 0);
    expect(content.length).toBeGreaterThan(0);
  });

  it('returns empty array for non-heading index', () => {
    const md = '# Heading\n\nParagraph';
    const { ast } = parseMarkdown(md);
    const content = getSectionContent(ast, 1);
    expect(content).toEqual([]);
  });
});

describe('serializeContentToMarkdown', () => {
  it('serializes paragraphs correctly', () => {
    const md = 'Hello **world**';
    const { ast } = parseMarkdown(md);
    const result = serializeContentToMarkdown(ast.children);
    expect(result).toContain('Hello');
    expect(result).toContain('**world**');
  });

  it('serializes headings correctly', () => {
    const md = '# Title\n\n## Subtitle';
    const { ast } = parseMarkdown(md);
    const result = serializeContentToMarkdown(ast.children);
    expect(result).toContain('# Title');
    expect(result).toContain('## Subtitle');
  });

  it('serializes lists correctly', () => {
    const md = '- Item 1\n- Item 2';
    const { ast } = parseMarkdown(md);
    const result = serializeContentToMarkdown(ast.children);
    expect(result).toContain('- Item 1');
    expect(result).toContain('- Item 2');
  });

  it('serializes inline code correctly', () => {
    const md = 'Use the `variable` function';
    const { ast } = parseMarkdown(md);
    const result = serializeContentToMarkdown(ast.children);
    expect(result).toContain('`variable`');
  });

  it('serializes links correctly', () => {
    const md = '[Click here](https://example.com)';
    const { ast } = parseMarkdown(md);
    const result = serializeContentToMarkdown(ast.children);
    expect(result).toContain('[Click here](https://example.com)');
  });
});
