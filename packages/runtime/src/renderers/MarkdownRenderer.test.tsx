import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownRenderer } from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders a paragraph', () => {
    const { getByText } = render(<MarkdownRenderer content="Hello world" />);
    expect(getByText('Hello world')).toBeInTheDocument();
  });

  it('renders headings with slugified ids', () => {
    const { container } = render(<MarkdownRenderer content="# Section Title" />);
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.id).toBe('section-title');
  });

  it('renders all heading levels', () => {
    const md = ['# H1', '## H2', '### H3', '#### H4', '##### H5', '###### H6'].join('\n\n');
    const { container } = render(<MarkdownRenderer content={md} />);
    expect(container.querySelector('h1')).not.toBeNull();
    expect(container.querySelector('h2')).not.toBeNull();
    expect(container.querySelector('h3')).not.toBeNull();
    expect(container.querySelector('h4')).not.toBeNull();
    expect(container.querySelector('h5')).not.toBeNull();
    expect(container.querySelector('h6')).not.toBeNull();
  });

  it('renders code blocks as pre>code', () => {
    const { container } = render(<MarkdownRenderer content={'```\nconst x = 1;\n```'} />);
    const pre = container.querySelector('pre');
    const code = pre?.querySelector('code');
    expect(pre).not.toBeNull();
    expect(code).not.toBeNull();
    expect(code?.textContent).toContain('const x = 1');
  });

  it('renders inline code', () => {
    const { container } = render(<MarkdownRenderer content="Use the `foo` function" />);
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('foo');
  });

  it('renders external links with target and rel attributes', () => {
    const { container } = render(<MarkdownRenderer content="[Open-Edu](https://open-edu.ai)" />);
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://open-edu.ai');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders internal links without target/rel', () => {
    const { container } = render(<MarkdownRenderer content="[Next](nodes/lesson-02.md)" />);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('nodes/lesson-02.md');
    expect(link?.getAttribute('target')).toBeNull();
  });

  it('adds alt fallback aria-hidden to images without alt text', () => {
    const { container } = render(<MarkdownRenderer content="![](image.png)" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('aria-hidden')).toBe('true');
    expect(img?.getAttribute('role')).toBe('presentation');
  });

  it('preserves alt text on images', () => {
    const { container } = render(<MarkdownRenderer content="![A diagram](diagram.png)" />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('A diagram');
    expect(img?.getAttribute('aria-hidden')).toBeNull();
  });

  it('renders GFM strikethrough', () => {
    const { container } = render(<MarkdownRenderer content="~~deleted~~" />);
    const del = container.querySelector('del');
    expect(del).not.toBeNull();
    expect(del?.textContent).toBe('deleted');
  });

  it('renders GFM task list checkboxes', () => {
    const md = '- [x] Done\n- [ ] Todo';
    const { container } = render(<MarkdownRenderer content={md} />);
    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
  });

  it('renders GFM tables', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const { container } = render(<MarkdownRenderer content={md} />);
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(container.querySelectorAll('th').length).toBe(2);
    expect(container.querySelectorAll('td').length).toBe(2);
  });

  it('renders blockquote', () => {
    const { container } = render(<MarkdownRenderer content="> A quote" />);
    expect(container.querySelector('blockquote')).not.toBeNull();
  });

  it('renders ordered and unordered lists', () => {
    const md = '- bullet\n- bullet2\n\n1. number\n2. number2';
    const { container } = render(<MarkdownRenderer content={md} />);
    expect(container.querySelectorAll('ul').length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll('ol').length).toBeGreaterThanOrEqual(1);
  });

  it('memoizes rendering across identical content', () => {
    const { container, rerender } = render(<MarkdownRenderer content="# Same" />);
    const first = container.querySelector('h1');
    rerender(<MarkdownRenderer content="# Same" />);
    const second = container.querySelector('h1');
    expect(second).toBe(first);
  });

  it('accepts a className', () => {
    const { container } = render(<MarkdownRenderer content="x" className="my-md" />);
    expect(container.querySelector('.my-md')).not.toBeNull();
  });
});
