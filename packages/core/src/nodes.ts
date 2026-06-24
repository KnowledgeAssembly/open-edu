import { readdir, readFile } from 'node:fs/promises';
import { join, extname, sep } from 'node:path';
import type { Dirent } from 'node:fs';
import { ContentNodeSchema } from '@open-edu/schemas';
import type { ContentNode } from '@open-edu/schemas';
import { NodeLoadError } from './errors.js';
import type { LoadedNode } from './types.js';

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
      throw new NodeLoadError(`Node file is not valid JSON: ${filePath}`, {
        file: filePath,
        suggestion: 'Fix the JSON syntax error',
      });
    }

    if (typeof parsed.type !== 'string') {
      throw new NodeLoadError(`JSON node file is missing required "type" field: ${filePath}`, {
        file: filePath,
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
      throw new NodeLoadError(`Invalid node content in ${filePath}: ${issues}`, {
        file: filePath,
        path: nodePath,
        suggestion: firstIssue
          ? `Fix the "${nodePath}" field in ${filePath}`
          : 'Check the node file structure matches the schema',
      });
    }

    return result.data;
  }

  throw new NodeLoadError(`Unsupported node file extension: ${filePath} (supported: .md, .json)`, {
    file: filePath,
    suggestion: `Rename the file to have a .md or .json extension`,
  });
}

function toForwardSlashes(p: string): string {
  return sep === '/' ? p : p.split(sep).join('/');
}

export async function loadNodes(packageDir: string): Promise<LoadedNode[]> {
  const nodesDir = join(packageDir, 'nodes');

  let entries: Dirent[];
  try {
    entries = await readdir(nodesDir, { withFileTypes: true });
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
    const node = detectNodeType(entry.name, content);

    nodes.push({
      path: absolutePath,
      relativePath: toForwardSlashes(join('nodes', entry.name)),
      content,
      node,
    });
  }

  return nodes;
}
