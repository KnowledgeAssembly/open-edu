import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

export interface ImportOptions {
  sourceDir: string;
  outputDir: string;
  bundleTitle?: string;
  bundleId?: string;
  bundleAuthor?: string;
}

export interface ImportResult {
  bundleDir: string;
  moduleCount: number;
  nodeCount: number;
  warnings: string[];
}

function kebabCase(str: string): string {
  return (
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'module'
  );
}

function detectNodeType(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes('lesson') || normalized.includes('observe')) return 'lesson';
  if (normalized.includes('quiz') || normalized.includes('mcq') || normalized.includes('test'))
    return 'quiz';
  if (normalized.includes('exercise') || normalized.includes('practice')) return 'exercise';
  if (normalized.includes('reflection') || normalized.includes('reflect')) return 'reflection';
  return 'custom';
}

function generateWorkflowNodes(nodeIds: string[]): Record<string, unknown> {
  const routing: Record<string, unknown> = {};
  for (let i = 0; i < nodeIds.length; i++) {
    if (i < nodeIds.length - 1) {
      routing[`nodes/${nodeIds[i]}.json`] = { onComplete: `nodes/${nodeIds[i + 1]}.json` };
    } else {
      routing[`nodes/${nodeIds[i]}.json`] = { onComplete: 'COMPLETED' };
    }
  }
  return routing;
}

export async function importLearnEasy(options: ImportOptions): Promise<ImportResult> {
  const { sourceDir, outputDir, bundleTitle, bundleId, bundleAuthor } = options;
  const warnings: string[] = [];
  let moduleCount = 0;
  let nodeCount = 0;

  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  } else {
    const existing = readdirSync(outputDir);
    if (existing.length > 0) {
      throw new Error(`Output directory is not empty: ${outputDir}. Use --force to override.`);
    }
  }

  // Read source directory - look for JSON files that represent activities/modules
  const sourceEntries = readdirSync(sourceDir, { withFileTypes: true });
  const moduleFiles = sourceEntries
    .filter((e) => e.isFile() && extname(e.name) === '.json')
    .sort((a, b) => a.name.localeCompare(b.name));

  if (moduleFiles.length === 0) {
    warnings.push('No JSON files found in source directory');
    return { bundleDir: outputDir, moduleCount: 0, nodeCount: 0, warnings };
  }

  // Parse all module files first
  const parsedModules: Array<{
    id: string;
    title: string;
    activities: Array<{ id: string; title: string; type: string }>;
    prerequisites: string[];
  }> = [];

  for (const modFile of moduleFiles) {
    const filePath = join(sourceDir, modFile.name);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      warnings.push(`Cannot read ${modFile.name}, skipping`);
      continue;
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(content);
    } catch {
      warnings.push(`Invalid JSON in ${modFile.name}, skipping`);
      continue;
    }

    const id = (json.id as string) ?? kebabCase(basename(modFile.name, '.json'));
    const title = (json.title as string) ?? id;
    const rawActivities = json.activities ?? json.nodes ?? [json];
    const activities = Array.isArray(rawActivities)
      ? rawActivities.map((a: any, i: number) => ({
          id: a.id ?? `${id}-activity-${i}`,
          title: a.title ?? `Activity ${i + 1}`,
          type: detectNodeType(a.type ?? a.title ?? ''),
        }))
      : [{ id: `${id}-activity-0`, title: title, type: 'lesson' }];

    parsedModules.push({
      id,
      title,
      activities,
      prerequisites: (json.prerequisites as string[]) ?? [],
    });
  }

  // Create bundle manifest
  const bundleManifest = {
    id: bundleId ?? kebabCase(basename(sourceDir)),
    type: 'bundle',
    title: bundleTitle ?? basename(sourceDir),
    version: '0.1.0',
    author: bundleAuthor ?? 'Learn-Easy Importer',
    modules: parsedModules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      path: `./modules/${mod.id}`,
      dependsOn: mod.prerequisites,
      estimatedDuration: mod.activities.length * 5,
    })),
  };

  // Create modules directory
  const modulesDir = join(outputDir, 'modules');
  mkdirSync(modulesDir, { recursive: true });

  // Create each module
  for (const mod of parsedModules) {
    const modDir = join(modulesDir, mod.id);
    mkdirSync(modDir, { recursive: true });

    // Create nodes directory
    const nodesDir = join(modDir, 'nodes');
    mkdirSync(nodesDir, { recursive: true });

    // Write node files
    const nodeIds: string[] = [];
    for (const activity of mod.activities) {
      const nodeFileName = `${activity.id}.json`;
      const nodeContent = {
        type: activity.type,
        title: activity.title,
        content: activity.title,
      };
      writeFileSync(join(nodesDir, nodeFileName), JSON.stringify(nodeContent, null, 2));
      nodeIds.push(activity.id);
      nodeCount++;
    }

    // Write workflow.json
    const workflow = { routing: generateWorkflowNodes(nodeIds) };
    writeFileSync(join(modDir, 'workflow.json'), JSON.stringify(workflow, null, 2));

    // Write package.json
    const manifest = {
      id: mod.id,
      title: mod.title,
      version: '0.1.0',
      author: bundleAuthor ?? 'Learn-Easy Importer',
      entry: `nodes/${nodeIds[0]}.json`,
    };
    writeFileSync(join(modDir, 'package.json'), JSON.stringify(manifest, null, 2));

    // Write validate.test.ts
    const testContent = `import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { join } from 'node:path';

describe('${mod.id}', () => {
  it('should load and validate', async () => {
    const pkg = await loadPackage(join(__dirname));
    expect(pkg.manifest.id).toBe('${mod.id}');
    expect(pkg.nodes.length).toBe(${mod.activities.length});
  });
});
`;
    writeFileSync(join(modDir, 'validate.test.ts'), testContent);

    moduleCount++;
  }

  // Write bundle.json
  writeFileSync(join(outputDir, 'bundle.json'), JSON.stringify(bundleManifest, null, 2));

  // Write root validate.test.ts
  const bundleTestContent = `import { describe, it, expect } from 'vitest';
import { loadBundle } from '@open-edu/core';
import { join } from 'node:path';

describe('${bundleManifest.id}', () => {
  it('should load and validate the bundle', async () => {
    const bundle = await loadBundle(join(__dirname));
    expect(bundle.manifest.id).toBe('${bundleManifest.id}');
    expect(bundle.modules.length).toBe(${moduleCount});
  });
});
`;
  writeFileSync(join(outputDir, 'validate.test.ts'), bundleTestContent);

  return {
    bundleDir: outputDir,
    moduleCount,
    nodeCount,
    warnings,
  };
}
