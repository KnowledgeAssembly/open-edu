import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { ContentNodeSchema } from '@open-edu/schemas';
import type { ContentNode } from '@open-edu/schemas';
import { NodeLoadError } from './errors';
import type { LoadedNode } from './types';

function detectNodeType(filePath: string, content: string): ContentNode {
  const ext = extname(filePath);

  if (ext === '.md') {
    return { type: 'lesson' };
  }

  if (ext === '.json') {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new NodeLoadError(`Node file is not valid JSON: ${filePath}`);
    }

    if (typeof parsed.type !== 'string') {
      throw new NodeLoadError(`JSON node file is missing required "type" field: ${filePath}`);
    }

    const result = ContentNodeSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map(
          (i: { path: (string | number)[]; message: string }) =>
            `${i.path.join('.')}: ${i.message}`,
        )
        .join('; ');
      throw new NodeLoadError(`Invalid node content in ${filePath}: ${issues}`);
    }

    return result.data;
  }

  throw new NodeLoadError(`Unsupported node file extension: ${filePath} (supported: .md, .json)`);
}

export async function loadNodes(packageDir: string): Promise<LoadedNode[]> {
  const nodesDir = join(packageDir, 'nodes');

  let files: string[];
  try {
    files = await readdir(nodesDir);
  } catch {
    return [];
  }

  const nodes: LoadedNode[] = [];

  for (const file of files) {
    const filePath = join(nodesDir, file);
    const content = await readFile(filePath, 'utf-8');
    const node = detectNodeType(file, content);

    nodes.push({
      path: filePath,
      relativePath: join('nodes', file),
      content,
      node,
    });
  }

  return nodes;
}
