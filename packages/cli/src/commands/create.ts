import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MANIFEST_ID_REGEX = /^[a-z0-9][a-z0-9_-]*$/;

export interface CreateOptions {
  id: string;
  title: string;
  author: string;
  force?: boolean;
}

export async function createPackage(
  dir: string,
  options: CreateOptions,
): Promise<{ success: boolean; error?: string; files?: string[] }> {
  const resolvedDir = resolve(dir);

  if (existsSync(resolvedDir)) {
    const entries = readdirSync(resolvedDir);
    if (entries.length > 0 && !options.force) {
      return {
        success: false,
        error: `Directory "${resolvedDir}" is not empty. Use --force to overwrite.`,
      };
    }
  } else {
    mkdirSync(resolvedDir, { recursive: true });
  }

  if (!options.id || !MANIFEST_ID_REGEX.test(options.id)) {
    return {
      success: false,
      error: `Invalid package ID "${options.id}". Use lowercase letters, numbers, hyphens, and underscores.`,
    };
  }

  mkdirSync(join(resolvedDir, 'nodes'), { recursive: true });

  const files: string[] = [];

  writeFileSync(
    join(resolvedDir, 'package.json'),
    JSON.stringify(
      {
        name: `@open-edu/example-${options.id}`,
        id: options.id,
        title: options.title || options.id,
        version: '0.1.0',
        private: true,
        description: `${options.title || options.id} educational package`,
        author: options.author || 'Open-Edu Author',
        entry: 'nodes/intro.md',
        scripts: { test: 'vitest run' },
        devDependencies: { '@open-edu/core': 'workspace:*' },
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );
  files.push('package.json');

  writeFileSync(
    join(resolvedDir, 'workflow.json'),
    JSON.stringify(
      {
        routing: {
          'nodes/intro.md': { onComplete: 'COMPLETED' },
        },
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );
  files.push('workflow.json');

  writeFileSync(
    join(resolvedDir, 'nodes/intro.md'),
    `# ${options.title || options.id}

Welcome to this Open-Edu learning package!

## Getting Started

This is a simple lesson to get you started with the Open-Edu framework.

### Key Concepts

- **Educational Packages** are portable learning experiences
- **Nodes** are individual pages (lessons, quizzes, reflections)
- **Workflows** define how learners navigate between nodes

When you're ready, click **Next** to complete this lesson.
`,
    'utf-8',
  );
  files.push('nodes/intro.md');

  writeFileSync(
    join(resolvedDir, 'validate.test.ts'),
    `import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('${options.id} package', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('${options.id}');
    expect(pkg.manifest.title).toBe('${options.title || options.id}');
    expect(pkg.manifest.entry).toBe('nodes/intro.md');
    expect(pkg.nodes).toHaveLength(1);
    expect(pkg.nodes[0].relativePath).toBe('nodes/intro.md');
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/intro.md');
  });
});
`,
    'utf-8',
  );
  files.push('validate.test.ts');

  return { success: true, files };
}
