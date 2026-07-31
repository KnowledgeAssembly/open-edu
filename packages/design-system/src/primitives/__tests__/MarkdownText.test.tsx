import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownText } from '../MarkdownText.js';
import { NativeEmojiPack, createOpenMojiPack, OPENMOJI_CDN_BASE_URL } from '../emoji-packs.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('MarkdownText', () => {
  it('renders bold and italic emphasis', () => {
    render(<MarkdownText content="A **bold** and *italic* word." />);
    expect(screen.getByText('bold')).toHaveProperty('tagName', 'STRONG');
    expect(screen.getByText('italic')).toHaveProperty('tagName', 'EM');
  });

  it('renders headings', () => {
    render(<MarkdownText content="## Heading" />);
    const heading = screen.getByText('Heading');
    expect(heading).toHaveProperty('tagName', 'H2');
  });

  it('renders a GFM table with header and cell rows', () => {
    render(
      <MarkdownText content={'| Term | Meaning |\n| --- | --- |\n| Atom | Smallest unit |'} />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Term' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Smallest unit' })).toBeInTheDocument();
  });

  it('renders ordered and unordered lists', () => {
    render(<MarkdownText content={'- One\n- Two\n\n1. First\n2. Second'} />);
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
  });

  it('renders inline code and fenced code blocks', () => {
    render(<MarkdownText content={'Use `let x = 1`.\n\n```js\nconst y = 2;\n```'} />);
    expect(screen.getByText('let x = 1')).toBeInTheDocument();
    const code = screen.getByText('const y = 2;');
    expect(code.closest('pre')).not.toBeNull();
  });

  it('renders blockquotes', () => {
    render(<MarkdownText content="> A thoughtful quote" />);
    expect(screen.getByText('A thoughtful quote').closest('blockquote')).not.toBeNull();
  });

  it('renders links and opens external links in a new tab', () => {
    render(<MarkdownText content="See [the docs](https://example.com)." />);
    const link = screen.getByRole('link', { name: 'the docs' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders an empty string without error', () => {
    render(<MarkdownText content="" />);
    expect(screen.getByTestId('markdown-text')).toBeInTheDocument();
  });

  describe('emoji composition', () => {
    it('keeps emoji as unicode text when no emojiPack is provided', () => {
      render(<MarkdownText content="Great job 🌟" />);
      expect(screen.getByText('Great job 🌟')).toBeInTheDocument();
    });

    it('keeps emoji as unicode text for the native pack', () => {
      render(<MarkdownText content="Great job 🌟" emojiPack={NativeEmojiPack} />);
      expect(screen.getByText('Great job 🌟')).toBeInTheDocument();
    });

    it('renders OpenMoji images for emoji inside markdown', () => {
      render(<MarkdownText content="Great **job** 🌟" emojiPack={createOpenMojiPack()} />);
      const img = screen.getByAltText('🌟');
      expect(img).toHaveAttribute('src', `${OPENMOJI_CDN_BASE_URL}/1F31F.svg`);
      expect(screen.getByText('job')).toHaveProperty('tagName', 'STRONG');
    });
  });

  describe('accessibility', () => {
    it('has no axe violations for plain markdown', async () => {
      await checkAccessibility(
        <MarkdownText content="Hello **world** with a [link](https://example.com)." />,
      );
    });

    it('has no axe violations for a table', async () => {
      await checkAccessibility(<MarkdownText content="| A | B |\n| --- | --- |\n| 1 | 2 |" />);
    });

    it('has no axe violations with an OpenMoji pack', async () => {
      await checkAccessibility(
        <MarkdownText content="Hello 🌟" emojiPack={createOpenMojiPack()} />,
      );
    });
  });
});
