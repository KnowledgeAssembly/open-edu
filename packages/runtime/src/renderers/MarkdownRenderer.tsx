import { useMemo, type ComponentProps, type ReactElement } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { useTranslation } from '@open-edu/i18n';
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
      className={`text-h1 font-display mb-paragraph-spacing mt-0${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }: ComponentProps<'h2'>) => (
    <h2
      id={slugify(String(children ?? ''))}
      className={`text-h2 font-display mb-paragraph-spacing mt-0${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }: ComponentProps<'h3'>) => (
    <h3
      id={slugify(String(children ?? ''))}
      className={`text-h3 font-display mb-paragraph-spacing mt-0${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }: ComponentProps<'h4'>) => (
    <h4
      id={slugify(String(children ?? ''))}
      className={`text-h4 font-display mb-paragraph-spacing mt-0${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }: ComponentProps<'h5'>) => (
    <h5
      id={slugify(String(children ?? ''))}
      className={`text-h5 font-display mb-paragraph-spacing mt-0${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }: ComponentProps<'h6'>) => (
    <h6
      id={slugify(String(children ?? ''))}
      className={`text-h6 font-display mb-paragraph-spacing mt-0${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </h6>
  ),
  p: ({ children, className, ...props }: ComponentProps<'p'>) => (
    <p
      className={`font-body-reading text-body-reading mb-paragraph-spacing${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, className, ...props }: ComponentProps<'ul'>) => (
    <ul
      className={`font-body-reading text-body-reading mb-paragraph-spacing list-disc pl-6${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }: ComponentProps<'ol'>) => (
    <ol
      className={`font-body-reading text-body-reading mb-paragraph-spacing list-decimal pl-6${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }: ComponentProps<'li'>) => (
    <li
      className={`font-body-reading text-body-reading${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </li>
  ),
  blockquote: ({ children, className, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote
      className={`font-body-reading text-body-reading mb-paragraph-spacing border-outline border-l-4 pl-4 italic${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </blockquote>
  ),
  pre: ({ children, className, ...props }: ComponentProps<'pre'>) => (
    <pre
      className={`mb-paragraph-spacing bg-surface-container overflow-x-auto rounded-md p-4 font-mono text-body-ui${className ? ` ${className}` : ''}`}
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
          className={`bg-surface-container rounded-sm px-1.5 py-0.5 font-mono text-body-ui${className ? ` ${className}` : ''}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`font-mono text-body-ui${className ? ` ${className}` : ''}`} {...props}>
        {children}
      </code>
    );
  },
  table: ({ children, className, ...props }: ComponentProps<'table'>) => (
    <div className="mb-paragraph-spacing overflow-x-auto">
      <table
        className={`text-body-ui w-full border-collapse${className ? ` ${className}` : ''}`}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, className, ...props }: ComponentProps<'th'>) => (
    <th
      className={`border-outline-variant bg-surface-container border-b px-3 py-2 text-left font-semibold${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, className, ...props }: ComponentProps<'td'>) => (
    <td
      className={`border-outline-variant border-b px-3 py-2${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </td>
  ),
  hr: ({ className, ...props }: ComponentProps<'hr'>) => (
    <hr
      className={`mb-paragraph-spacing border-outline-variant${className ? ` ${className}` : ''}`}
      {...props}
    />
  ),
  img: ({ alt, src, ...props }: ComponentProps<'img'>) => {
    const resolvedSrc =
      src &&
      !src.startsWith('/') &&
      !src.startsWith('http://') &&
      !src.startsWith('https://') &&
      !src.startsWith('data:') &&
      !src.startsWith('#')
        ? `/assets/${src.replace(/^\.\//, '')}`
        : src;
    if (!alt || alt.trim() === '') {
      return <img {...props} src={resolvedSrc} alt="" aria-hidden="true" role="presentation" />;
    }
    return <img {...props} src={resolvedSrc} alt={alt} />;
  },
  a: ({ href, children, className, ...props }: ComponentProps<'a'>) => {
    const isExternal =
      typeof href === 'string' && (href.startsWith('http://') || href.startsWith('https://'));
    return (
      <a
        href={href}
        className={`text-primary underline underline-offset-2${className ? ` ${className}` : ''}`}
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
  const { t } = useTranslation();
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
      {rendered ?? <p>{t('runtime.markdown.render_error')}</p>}
    </div>
  );
}
