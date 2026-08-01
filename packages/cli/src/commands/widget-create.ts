import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '@open-edu/logger';

const TEMPLATE_DIR = resolve(
  fileURLToPath(new URL('../../../../packages/widgets/templates/widget-scaffold', import.meta.url)),
);

const logger = createLogger({ scope: 'cli:widget-create' });

export interface WidgetCreateOptions {
  id: string;
  title?: string;
  force?: boolean;
}

export async function widgetCreate(
  dir: string,
  options: WidgetCreateOptions,
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

  // Validate widget ID
  if (!options.id || !/^[a-z0-9.-]+$/.test(options.id)) {
    return {
      success: false,
      error: `Invalid widget ID "${options.id}". Use lowercase letters, numbers, dots, and hyphens.`,
    };
  }

  const files: string[] = [];

  // Copy and process template files
  const templateFiles = ['package.json', 'tsconfig.json', 'vitest.config.ts'];
  const templateSrcFiles = ['src/index.tsx', 'src/index.test.tsx'];

  // Create directories
  mkdirSync(join(resolvedDir, 'src'), { recursive: true });

  for (const file of templateFiles) {
    const src = join(TEMPLATE_DIR, file);
    const dest = join(resolvedDir, file);
    if (existsSync(src)) {
      let content = readFileSync(src, 'utf-8');
      content = content.replace(/my-widget/g, options.id);
      content = content.replace(/My Widget/g, options.title || options.id);
      writeFileSync(dest, content, 'utf-8');
      files.push(file);
    }
  }

  for (const file of templateSrcFiles) {
    const src = join(TEMPLATE_DIR, file);
    const dest = join(resolvedDir, file);
    if (existsSync(src)) {
      let content = readFileSync(src, 'utf-8');
      content = content.replace(/my-widget/g, options.id);
      content = content.replace(/my-widget-id/g, options.id);
      writeFileSync(dest, content, 'utf-8');
      files.push(file);
    }
  }

  logger.info('Widget scaffold created', {
    dir: resolvedDir,
    id: options.id,
    fileCount: files.length,
  });
  return { success: true, files };
}
