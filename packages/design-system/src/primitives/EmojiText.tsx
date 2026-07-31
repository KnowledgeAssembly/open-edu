import * as React from 'react';
import { cn } from '../lib/utils.js';
import type { EmojiPack } from './emoji-packs.js';

export interface EmojiTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  pack: EmojiPack;
}

export type EmojiRun = { type: 'emoji' | 'text'; value: string };

const EMOJI_RUN_REGEX =
  /\p{Extended_Pictographic}(?:\u{FE0F}|[\u{1F3FB}-\u{1F3FF}]|\u{200D}\p{Extended_Pictographic})*/gu;

export function splitEmojiRuns(text: string): EmojiRun[] {
  const runs: EmojiRun[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(EMOJI_RUN_REGEX)) {
    const index = match.index;
    if (index > lastIndex) {
      runs.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    runs.push({ type: 'emoji', value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    runs.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return runs;
}

export function emojiToHex(emoji: string): string {
  const codePoint = emoji.codePointAt(0) ?? 0;
  return codePoint.toString(16).toUpperCase().padStart(4, '0');
}

export const EmojiText = React.forwardRef<HTMLSpanElement, EmojiTextProps>(function EmojiText(
  { text, pack, className, ...props },
  ref,
): JSX.Element {
  if (pack.format === 'native' || !pack.getUrl) {
    return (
      <span ref={ref} className={cn(className)} {...props}>
        {text}
      </span>
    );
  }

  const runs = splitEmojiRuns(text);

  return (
    <span ref={ref} className={cn(className)} {...props}>
      {runs.map((run, i) =>
        run.type === 'emoji' ? (
          <EmojiGlyph key={i} emoji={run.value} pack={pack} />
        ) : (
          <React.Fragment key={i}>{run.value}</React.Fragment>
        ),
      )}
    </span>
  );
});
EmojiText.displayName = 'EmojiText';

export function EmojiGlyph({ emoji, pack }: { emoji: string; pack: EmojiPack }): JSX.Element {
  const [failed, setFailed] = React.useState(false);
  const src = pack.getUrl?.(emojiToHex(emoji));

  if (failed || !src) {
    return <span role="img">{emoji}</span>;
  }

  return (
    <img
      src={src}
      alt={emoji}
      draggable={false}
      loading="lazy"
      className="inline-block h-[1.2em] w-[1.2em] object-contain align-[-0.2em]"
      onError={() => setFailed(true)}
    />
  );
}
