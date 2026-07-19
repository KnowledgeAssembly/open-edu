import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const distPath = path.resolve(__dirname, '../../dist');
const distExists = fs.existsSync(distPath);

describe.skipIf(!distExists)('Build output contains PWA files', () => {
  it('dist contains service worker file', () => {
    const files = fs.readdirSync(distPath);
    const swFiles = files.filter(f => f.startsWith('sw') && f.endsWith('.js'));
    expect(swFiles.length).toBeGreaterThan(0);
  });

  it('dist contains manifest.webmanifest', () => {
    const manifestPath = path.resolve(distPath, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);
  });
});
