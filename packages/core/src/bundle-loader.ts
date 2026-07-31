import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BundleManifestSchema } from '@open-edu/schemas';
import type { BundleManifest } from '@open-edu/schemas';
import { loadPackage } from './loader.js';
import { loadRewards } from './rewards.js';
import { loadCards } from './cards.js';
import type { LoadedPackage, LoadedBundle } from './types.js';
import {
  BundleValidationError,
  ModuleNotFoundError,
  ModuleMismatchError,
  CircularDependencyError,
  MissingPrerequisiteError,
} from './errors.js';

export async function loadBundle(bundleDir: string): Promise<LoadedBundle> {
  let raw: string;
  try {
    raw = readFileSync(join(bundleDir, 'bundle.json'), 'utf-8');
  } catch (err) {
    throw new BundleValidationError(
      `Cannot read bundle.json in ${bundleDir}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(raw);
  } catch {
    throw new BundleValidationError(`bundle.json in ${bundleDir} is not valid JSON`);
  }

  let manifest: BundleManifest;
  try {
    manifest = BundleManifestSchema.parse(manifestJson);
  } catch (err: unknown) {
    const zodErr = (err as { issues?: unknown })?.issues ? (err as any) : null;
    throw new BundleValidationError(`bundle.json validation failed in ${bundleDir}`, zodErr, {
      file: join(bundleDir, 'bundle.json'),
    });
  }

  const modules: LoadedPackage[] = [];
  const moduleMap = new Map<string, LoadedPackage>();

  for (const moduleRef of manifest.modules) {
    const resolvedPath = resolve(bundleDir, moduleRef.path);

    // Security: reject path traversal
    const bundleRoot = resolve(bundleDir);
    if (!resolvedPath.startsWith(bundleRoot)) {
      throw new ModuleNotFoundError(
        `Module path "${moduleRef.path}" escapes the bundle directory`,
        { file: join(bundleDir, 'bundle.json'), path: `modules[${moduleRef.id}].path` },
      );
    }

    let loadedPkg: LoadedPackage;
    try {
      loadedPkg = await loadPackage(resolvedPath);
    } catch (err) {
      throw new ModuleNotFoundError(
        `Module "${moduleRef.id}" at "${moduleRef.path}" could not be loaded: ${err instanceof Error ? err.message : String(err)}`,
        { file: join(bundleDir, 'bundle.json'), path: `modules[${moduleRef.id}]` },
      );
    }

    if (moduleRef.id !== loadedPkg.manifest.id) {
      throw new ModuleMismatchError(
        `Module ref id "${moduleRef.id}" does not match package manifest id "${loadedPkg.manifest.id}"`,
        {
          file: join(bundleDir, 'bundle.json'),
          path: `modules[${moduleRef.id}]`,
          suggestion: `Set both the module ref id and the package.json id to "${moduleRef.id}"`,
        },
      );
    }

    modules.push(loadedPkg);
    moduleMap.set(moduleRef.id, loadedPkg);
  }

  // Validate dependency graph
  const moduleIds = new Set(modules.map((m) => m.manifest.id));

  // Check for dangling prerequisites
  for (const moduleRef of manifest.modules) {
    for (const depId of moduleRef.dependsOn) {
      if (!moduleIds.has(depId)) {
        throw new MissingPrerequisiteError(
          `Module "${moduleRef.id}" depends on "${depId}" which is not a module in this bundle`,
          {
            file: join(bundleDir, 'bundle.json'),
            path: `modules[${moduleRef.id}].dependsOn`,
            suggestion: `Add a module with id "${depId}" or remove the dependency`,
          },
        );
      }
    }
  }

  // Detect cycles via DFS
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(currentId: string, path: string[]): string | null {
    if (inStack.has(currentId)) {
      const cycleStart = path.indexOf(currentId);
      return [...path.slice(cycleStart), currentId].join(' -> ');
    }
    if (visited.has(currentId)) return null;

    visited.add(currentId);
    inStack.add(currentId);
    path.push(currentId);

    const moduleRef = manifest.modules.find((m) => m.id === currentId);
    if (moduleRef) {
      for (const depId of moduleRef.dependsOn) {
        const cycle = dfs(depId, path);
        if (cycle) return cycle;
      }
    }

    path.pop();
    inStack.delete(currentId);
    return null;
  }

  for (const mod of modules) {
    const cycle = dfs(mod.manifest.id, []);
    if (cycle) {
      throw new CircularDependencyError(`Circular dependency detected: ${cycle}`, {
        file: join(bundleDir, 'bundle.json'),
      });
    }
  }

  const [rewards, cards] = await Promise.all([loadRewards(bundleDir), loadCards(bundleDir)]);

  return { rootDir: bundleDir, manifest, modules, moduleMap, rewards, cards };
}

export type { LoadedBundle };
