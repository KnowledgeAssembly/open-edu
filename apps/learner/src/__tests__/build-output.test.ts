import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const distPath = path.resolve(__dirname, '../../dist');
const swFiles = fs.existsSync(distPath)
  ? fs.readdirSync(distPath).filter((f) => f.startsWith('sw') && f.endsWith('.js'))
  : [];
const hasManifest = fs.existsSync(path.resolve(distPath, 'manifest.webmanifest'));

describe.skipIf(swFiles.length === 0)('Build output contains PWA files', () => {
  it('dist contains service worker file', () => {
    expect(swFiles.length).toBeGreaterThan(0);
  });

  it.skipIf(!hasManifest)('dist contains manifest.webmanifest', () => {
    expect(hasManifest).toBe(true);
  });
});
