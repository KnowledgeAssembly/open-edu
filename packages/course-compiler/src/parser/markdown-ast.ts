import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import type { Root, Heading, Yaml, Content, Paragraph, Text } from 'mdast';

function findYamlNodes(node: Content | Root): Yaml[] {
  const results: Yaml[] = [];
  if ('children' in node) {
    for (const child of node.children as Content[]) {
      if (child.type === 'yaml') {
        results.push(child as Yaml);
      }
      if ('children' in child) {
        results.push(...findYamlNodes(child as unknown as Content));
      }
    }
  }
  return results;
}

export function parseMarkdown(markdown: string): {
  ast: Root;
  frontmatter: Record<string, unknown>;
} {
  const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkGfm);

  const ast = processor.parse(markdown);

  let frontmatter: Record<string, unknown> = {};
  const yamlNodes = findYamlNodes(ast as Root);
  for (const node of yamlNodes) {
    try {
      const parsed = parseSimpleYaml(node.value);
      frontmatter = { ...frontmatter, ...parsed };
    } catch {
      // If YAML is malformed, leave frontmatter as empty
    }
  }

  return { ast: ast as Root, frontmatter };
}

function parseSimpleYaml(value: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of value.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1 || colonIndex === 0) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    let val: unknown = trimmed.slice(colonIndex + 1).trim();
    if (typeof val === 'string') {
      if (val === 'true') {
        val = true;
      } else if (val === 'false') {
        val = false;
      } else if (/^\d+$/.test(val)) {
        val = Number(val);
      } else if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      } else if (val.startsWith('[') && val.endsWith(']')) {
        val = val
          .slice(1, -1)
          .split(',')
          .map((s: string) => {
            const t = s.trim();
            if (t === 'true') return true;
            if (t === 'false') return false;
            if (!isNaN(Number(t)) && t.length > 0) return Number(t);
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
              return t.slice(1, -1);
            return t;
          });
      }
    }
    result[key] = val;
  }
  return result;
}

export function findHeading(
  ast: Root,
  depth: 1 | 2 | 3 | 4 | 5 | 6,
  text?: string,
): Heading | undefined {
  return ast.children.find(
    (node): node is Heading =>
      node.type === 'heading' &&
      node.depth === depth &&
      (text === undefined || extractHeadingText(node) === text),
  );
}

export function getSectionContent(ast: Root, headingIndex: number): Content[] {
  const heading = ast.children[headingIndex];
  if (!heading || heading.type !== 'heading') return [];

  const startIndex = headingIndex + 1;
  const headingDepth = heading.depth;

  let endIndex = ast.children.length;
  for (let i = startIndex; i < ast.children.length; i++) {
    const node = ast.children[i];
    if (!node) continue;
    if (node.type === 'heading' && node.depth <= headingDepth) {
      endIndex = i;
      break;
    }
  }

  return ast.children.slice(startIndex, endIndex);
}

export function extractHeadingText(heading: Heading): string {
  return heading.children
    .filter((child): child is Text => child.type === 'text')
    .map((child) => child.value)
    .join('');
}

export function serializeContentToMarkdown(nodes: Content[]): string {
  let result = '';
  for (const node of nodes) {
    result += serializeNode(node) + '\n\n';
  }
  return result.trim();
}

function serializeNode(node: Content): string {
  switch (node.type) {
    case 'paragraph':
      return serializeChildren(node);
    case 'heading':
      return '#'.repeat(node.depth) + ' ' + serializeChildren(node);
    case 'list': {
      const list = node as { ordered: boolean; start?: number; children: Content[] };
      const items = list.children;
      return items
        .map((item, idx) => {
          const listItem = item as { checked?: boolean | null; children: Content[] };
          const prefix = list.ordered ? `${(list.start ?? 1) + idx}. ` : '- ';
          const checkbox =
            listItem.checked === true ? '[x] ' : listItem.checked === false ? '[ ] ' : '';
          const paragraph = listItem.children[0] as Paragraph | undefined;
          return prefix + checkbox + (paragraph ? serializeChildren(paragraph) : '');
        })
        .join('\n');
    }
    case 'listItem': {
      const paragraph = (node as { children: Content[] }).children[0] as Paragraph | undefined;
      return '- ' + (paragraph ? serializeChildren(paragraph) : '');
    }
    case 'thematicBreak':
      return '---';
    case 'code':
      return (
        '```' +
        ((node as { lang?: string }).lang ?? '') +
        '\n' +
        (node as { value: string }).value +
        '\n```'
      );
    case 'inlineCode':
      return '`' + (node as { value: string }).value + '`';
    case 'emphasis':
      return '*' + serializeChildren(node) + '*';
    case 'strong':
      return '**' + serializeChildren(node) + '**';
    case 'text':
      return (node as Text).value;
    case 'link':
      return '[' + serializeChildren(node) + '](' + (node as { url: string }).url + ')';
    case 'image':
      return '![' + (node as { alt?: string }).alt + '](' + (node as { url: string }).url + ')';
    case 'blockquote':
      return '> ' + serializeChildren(node);
    default:
      return '';
  }
}

function serializeChildren(node: { children?: Content[] }): string {
  if (!node.children) return '';
  return node.children.map((child) => serializeNode(child)).join('');
}
