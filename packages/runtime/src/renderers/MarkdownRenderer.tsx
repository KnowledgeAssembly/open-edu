import { useMemo, type ComponentProps, type ReactElement } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';

type ComponentMap = Partial<{
  [K in keyof JSX.IntrinsicElements]:
    | keyof JSX.IntrinsicElements
    | ((props: ComponentProps<K>) => ReactElement | null);
}>;

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  components?: ComponentMap;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

const accessibleComponents: ComponentMap = {
  h1: ({ children, className, ...props }: ComponentProps<'h1'>) => (
    <h1
      id={slugify(String(children ?? ''))}
      className={`text-h1 font-display font-bold${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }: ComponentProps<'h2'>) => (
    <h2
      id={slugify(String(children ?? ''))}
      className={`text-h2 font-display font-bold${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }: ComponentProps<'h3'>) => (
    <h3
      id={slugify(String(children ?? ''))}
      className={`text-xl font-display font-bold${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }: ComponentProps<'h4'>) => (
    <h4
      id={slugify(String(children ?? ''))}
      className={`text-lg font-display font-bold${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }: ComponentProps<'h5'>) => (
    <h5
      id={slugify(String(children ?? ''))}
      className={`text-base font-display font-bold${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }: ComponentProps<'h6'>) => (
    <h6
      id={slugify(String(children ?? ''))}
      className={`text-sm font-display font-bold${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h6>
  ),
  img: ({ alt, src, ...props }: ComponentProps<'img'>) => {
    if (!alt || alt.trim() === '') {
      return <img {...props} src={src} alt="" aria-hidden="true" role="presentation" />;
    }
    return <img {...props} src={src} alt={alt} />;
  },
  a: ({ href, children, ...props }: ComponentProps<'a'>) => {
    const isExternal =
      typeof href === 'string' && (href.startsWith('http://') || href.startsWith('https://'));
    return (
      <a
        href={href}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
};

export function MarkdownRenderer({
  content,
  className,
  components,
}: MarkdownRendererProps): JSX.Element {
  const rendered = useMemo(() => {
    const merged: ComponentMap = { ...accessibleComponents, ...components };
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeReact, {
        Fragment,
        jsx,
        jsxs,
        components: merged as never,
      });
    const file = processor.processSync(content);
    return file.result as ReactElement;
  }, [content, components]);

  return (
    <div className={className} data-testid="markdown-renderer">
      {rendered ?? <p>Unable to render content.</p>}
    </div>
  );
}
