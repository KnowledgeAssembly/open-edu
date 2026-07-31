import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiText, splitEmojiRuns, emojiToHex } from '../EmojiText.js';
import { NativeEmojiPack, createOpenMojiPack, OPENMOJI_CDN_BASE_URL } from '../emoji-packs.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('splitEmojiRuns', () => {
  it('splits plain text into a single text run', () => {
    expect(splitEmojiRuns('Hello world')).toEqual([{ type: 'text', value: 'Hello world' }]);
  });

  it('splits emoji and text into alternating runs', () => {
    expect(splitEmojiRuns('Great job 🌟 Keep going!')).toEqual([
      { type: 'text', value: 'Great job ' },
      { type: 'emoji', value: '🌟' },
      { type: 'text', value: ' Keep going!' },
    ]);
  });

  it('keeps skin-tone and ZWJ sequences in a single emoji run', () => {
    const runs = splitEmojiRuns('Hi 👋🏽 family 👨‍👩‍👧');
    expect(runs.filter((r) => r.type === 'emoji')).toHaveLength(2);
  });
});

describe('emojiToHex', () => {
  it('converts 🌟 (U+1F31F) to 1F31F', () => {
    expect(emojiToHex('🌟')).toBe('1F31F');
  });
});

describe('EmojiText', () => {
  it('renders raw text for the native pack', () => {
    render(<EmojiText text="Hello 🌟" pack={NativeEmojiPack} />);
    expect(screen.getByText('Hello 🌟')).toBeInTheDocument();
  });

  it('renders an SVG img for an OpenMoji pack', () => {
    render(<EmojiText text="Great job 🌟" pack={createOpenMojiPack()} />);
    const img = screen.getByAltText('🌟');
    expect(img).toHaveAttribute('src', `${OPENMOJI_CDN_BASE_URL}/1F31F.svg`);
  });

  it('falls back to native emoji text when the image fails to load', () => {
    render(<EmojiText text="Great job 🌟" pack={createOpenMojiPack()} />);
    fireEvent.error(screen.getByAltText('🌟'));
    expect(screen.getByText('🌟')).toBeInTheDocument();
  });

  it('keeps surrounding text when rendering an OpenMoji pack', () => {
    render(<EmojiText text="Great job 🌟 Keep going!" pack={createOpenMojiPack()} />);
    expect(screen.getByText('Great job ', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(' Keep going!', { exact: false })).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has no axe violations with native pack', async () => {
      await checkAccessibility(<EmojiText text="Hello 🌟" pack={NativeEmojiPack} />);
    });

    it('has no axe violations with OpenMoji pack', async () => {
      await checkAccessibility(<EmojiText text="Hello 🌟" pack={createOpenMojiPack()} />);
    });
  });
});
