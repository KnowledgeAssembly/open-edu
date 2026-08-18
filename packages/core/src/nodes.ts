import { ContentNodeSchema } from '@open-edu/schemas';
import type { ContentNode } from '@open-edu/schemas';
import { NodeLoadError } from './errors.js';
import type { LoadedNode, PackageFileSource } from './types.js';

const TEXT_DECODER = new TextDecoder();

function extractTitle(content: string): string | undefined {
  const match = content.match(/^#\s+(.+)/m);
  return match?.[1]?.trim();
}

export function parseNodeContent(relativePath: string, content: string): ContentNode {
  const ext = extname(relativePath);

  if (ext === '.md') {
    return { type: 'lesson', title: extractTitle(content) };
  }

  if (ext === '.json') {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new NodeLoadError(`Node file is not valid JSON: ${relativePath}`, {
        file: relativePath,
        suggestion: 'Fix the JSON syntax error',
      });
    }

    if (typeof parsed.type !== 'string') {
      throw new NodeLoadError(`JSON node file is missing required "type" field: ${relativePath}`, {
        file: relativePath,
        path: 'type',
        suggestion:
          'Add "type": "lesson" | "quiz" | "reflection" | "exercise" | "custom" to the node file',
      });
    }

    const result = ContentNodeSchema.safeParse(parsed);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const nodePath = firstIssue ? firstIssue.path.join('.') : undefined;
      const issues = result.error.issues
        .map(
          (i: { path: (string | number)[]; message: string }) =>
            `${i.path.join('.')}: ${i.message}`,
        )
        .join('; ');
      throw new NodeLoadError(`Invalid node content in ${relativePath}: ${issues}`, {
        file: relativePath,
        path: nodePath,
        suggestion: firstIssue
          ? `Fix the "${nodePath}" field in ${relativePath}`
          : 'Check the node file structure matches the schema',
      });
    }

    return result.data;
  }

  throw new NodeLoadError(
    `Unsupported node file extension: ${relativePath} (supported: .md, .json)`,
    {
      file: relativePath,
      suggestion: `Rename the file to have a .md or .json extension`,
    },
  );
}

function extname(p: string): string {
  const idx = p.lastIndexOf('.');
  return idx === -1 ? '' : p.slice(idx);
}

export function loadNodesFromSource(source: PackageFileSource): LoadedNode[] {
  const nodes: LoadedNode[] = [];

  for (const relativePath of source.list('nodes/')) {
    const afterPrefix = relativePath.slice('nodes/'.length);
    if (afterPrefix.includes('/')) {
      const subdir = afterPrefix.split('/')[0]!;
      throw new NodeLoadError(
        `Subdirectories inside nodes/ are not supported. Move "${subdir}" to a flat file: ${relativePath}`,
      );
    }

    const bytes = source.get(relativePath);
    if (bytes === undefined) continue;

    const content = TEXT_DECODER.decode(bytes);
    const node = parseNodeContent(relativePath, content);

    nodes.push({
      path: relativePath,
      relativePath,
      content,
      node,
    });
  }

  return nodes;
}

export async function loadNodes(packageDir: string): Promise<LoadedNode[]> {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const nodesDir = join(packageDir, 'nodes');

  interface DirentLike {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }

  let entries: DirentLike[];
  try {
    entries = (await readdir(nodesDir, { withFileTypes: true })) as unknown as DirentLike[];
  } catch {
    return [];
  }

  const nodes: LoadedNode[] = [];

  for (const entry of entries) {
    const absolutePath = join(nodesDir, entry.name);

    if (entry.isDirectory()) {
      throw new NodeLoadError(
        `Subdirectories inside nodes/ are not supported. Move "${entry.name}" to a flat file or use the widgets package: ${absolutePath}`,
      );
    }
    if (!entry.isFile()) {
      continue;
    }

    const content = await readFile(absolutePath, 'utf-8').catch((err: NodeJS.ErrnoException) => {
      throw new NodeLoadError(`Failed to read node "${entry.name}": ${err.message}`);
    });
    const relativePath = `nodes/${entry.name}`;
    const node = parseNodeContent(relativePath, content);

    nodes.push({
      path: absolutePath,
      relativePath,
      content,
      node,
    });
  }

  return nodes;
}
