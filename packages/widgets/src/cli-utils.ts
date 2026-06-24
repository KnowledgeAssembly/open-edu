import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface WidgetPackageValidation {
  valid: boolean;
  errors: Array<{ file: string; message: string }>;
  widgetDef?: { id: string; version?: string };
}

export function validateWidgetPackage(dir: string): WidgetPackageValidation {
  const errors: Array<{ file: string; message: string }> = [];

  // Check package.json
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    errors.push({ file: 'package.json', message: 'package.json not found' });
    return { valid: false, errors };
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    errors.push({ file: 'package.json', message: 'Invalid JSON' });
    return { valid: false, errors };
  }

  const peerDeps = (pkg.peerDependencies as Record<string, string>) ?? {};
  if (!peerDeps['@open-edu/widgets']) {
    errors.push({ file: 'package.json', message: 'Missing peerDependency: @open-edu/widgets' });
  }
  if (!peerDeps['react']) {
    errors.push({ file: 'package.json', message: 'Missing peerDependency: react' });
  }

  // Check src/index.tsx exists
  const srcPath = join(dir, 'src', 'index.tsx');
  if (!existsSync(srcPath)) {
    errors.push({ file: 'src/index.tsx', message: 'Widget entry file not found' });
  }

  return { valid: errors.length === 0, errors };
}
