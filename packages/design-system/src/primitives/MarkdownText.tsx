import * as React from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import { cn } from '../lib/utils.js';
import { EmojiGlyph, splitEmojiRuns } from './EmojiText.js';
import type { EmojiPack } from './emoji-packs.js';

type ComponentMap = Partial<{
  [K in keyof JSX.IntrinsicElements]:
    | keyof JSX.IntrinsicElements
    | ((props: ComponentProps<K>) => ReactElement | null);
}>;

const chatComponents: ComponentMap = {
  h1: ({ children, className, ...props }: ComponentProps<'h1'>) => (
    <h1 className={cn('mb-1 mt-3 text-sm font-semibold first:mt-0', className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }: ComponentProps<'h2'>) => (
    <h2 className={cn('mb-1 mt-3 text-sm font-semibold first:mt-0', className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }: ComponentProps<'h3'>) => (
    <h3 className={cn('mb-1 mt-2 text-sm font-semibold first:mt-0', className)} {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }: ComponentProps<'h4'>) => (
    <h4 className={cn('mb-1 mt-2 font-semibold first:mt-0', className)} {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }: ComponentProps<'h5'>) => (
    <h5 className={cn('mb-1 mt-2 font-semibold first:mt-0', className)} {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }: ComponentProps<'h6'>) => (
    <h6 className={cn('mb-1 mt-2 font-semibold first:mt-0', className)} {...props}>
      {children}
    </h6>
  ),
  p: ({ children, className, ...props }: ComponentProps<'p'>) => (
    <p className={cn('mb-2 last:mb-0', className)} {...props}>
      {children}
    </p>
  ),
  ul: ({ children, className, ...props }: ComponentProps<'ul'>) => (
    <ul className={cn('mb-2 list-disc pl-4 last:mb-0', className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }: ComponentProps<'ol'>) => (
    <ol className={cn('mb-2 list-decimal pl-4 last:mb-0', className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }: ComponentProps<'li'>) => (
    <li className={cn('mb-0.5', className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, className, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote
      className={cn(
        'text-on-surface-muted border-outline mb-2 border-l-2 pl-2 italic last:mb-0',
        className,
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  pre: ({ children, className, ...props }: ComponentProps<'pre'>) => (
    <pre
      className={cn(
        'bg-surface-container mb-2 overflow-x-auto rounded-md p-3 last:mb-0',
        className,
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }: ComponentProps<'code'>) => {
    const isInline = !className?.includes('language-');
    if (isInline) {
      return (
        <code
          className={cn(
            'bg-surface-container text-mono rounded-sm px-1 py-0.5 font-mono',
            className,
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn('text-mono font-mono', className)} {...props}>
        {children}
      </code>
    );
  },
  table: ({ children, className, ...props }: ComponentProps<'table'>) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className={cn('w-full border-collapse text-left', className)} {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, className, ...props }: ComponentProps<'th'>) => (
    <th
      className={cn('border-outline-variant border-b px-2 py-1 font-semibold', className)}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, className, ...props }: ComponentProps<'td'>) => (
    <td className={cn('border-outline-variant border-b px-2 py-1 align-top', className)} {...props}>
      {children}
    </td>
  ),
  hr: ({ className, ...props }: ComponentProps<'hr'>) => (
    <hr className={cn('border-outline-variant my-2', className)} {...props} />
  ),
  img: ({ alt, src, ...props }: ComponentProps<'img'>) => {
    if (!alt || alt.trim() === '') {
      return <img {...props} src={src} alt="" aria-hidden="true" role="presentation" />;
    }
    return <img {...props} src={src} alt={alt} className="max-w-full rounded" />;
  },
  a: ({ href, children, className, ...props }: ComponentProps<'a'>) => {
    const isExternal =
      typeof href === 'string' && (href.startsWith('http://') || href.startsWith('https://'));
    return (
      <a
        href={href}
        className={cn('text-primary underline underline-offset-2', className)}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeReact, {
    Fragment,
    jsx,
    jsxs,
    components: chatComponents as never,
  });

function renderWithEmoji(node: ReactNode, pack: EmojiPack): ReactNode {
  if (typeof node === 'string') {
    const runs = splitEmojiRuns(node);
    const first = runs[0];
    if (runs.length === 1 && first && first.type === 'text') {
      return node;
    }
    return runs.map((run, i) =>
      run.type === 'emoji' ? <EmojiGlyph key={i} emoji={run.value} pack={pack} /> : run.value,
    );
  }
  if (Array.isArray(node)) {
    return node.map((child) => renderWithEmoji(child, pack));
  }
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: ReactNode }).children;
    return React.cloneElement(
      node,
      undefined,
      children === undefined ? children : renderWithEmoji(children, pack),
    );
  }
  return node;
}

export interface MarkdownTextProps {
  content: string;
  className?: string;
  emojiPack?: EmojiPack | null;
}

export function MarkdownText({ content, className, emojiPack }: MarkdownTextProps): JSX.Element {
  const rendered = React.useMemo(() => {
    const file = processor.processSync(content);
    return file.result as ReactElement;
  }, [content]);

  const output = React.useMemo(() => {
    if (emojiPack && emojiPack.format !== 'native' && emojiPack.getUrl) {
      return renderWithEmoji(rendered, emojiPack);
    }
    return rendered;
  }, [rendered, emojiPack]);

  return (
    <div className={cn(className)} data-testid="markdown-text">
      {output}
    </div>
  );
}
MarkdownText.displayName = 'MarkdownText';
