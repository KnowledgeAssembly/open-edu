import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { CliResult } from '../utils/json-output.js';

export async function i18nExtract(
  sourceDir: string,
  outputDir: string,
): Promise<CliResult> {
  const keys = new Set<string>();
  const pattern = /\bt\(\s*['"`]([^'"`]+)['"`]/g;

  function scanDir(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = readFileSync(fullPath, 'utf-8');
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match[1]) keys.add(match[1]);
        }
      }
    }
  }

  scanDir(sourceDir);

  const output = existsSync(outputDir) ? outputDir : sourceDir;
  const outputPath = join(output, 'extracted-keys.json');
  writeFileSync(outputPath, JSON.stringify([...keys].sort(), null, 2));

  return {
    success: true,
    data: { keysCount: keys.size, outputPath },
  };
}
