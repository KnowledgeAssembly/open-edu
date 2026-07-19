import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Build output contains PWA files', () => {
  it('dist directory exists', () => {
    const distPath = path.resolve(__dirname, '../../dist');
    expect(fs.existsSync(distPath)).toBe(true);
  });

  it('dist contains service worker file', () => {
    const distPath = path.resolve(__dirname, '../../dist');
    const files = fs.readdirSync(distPath);
    const swFiles = files.filter(f => f.startsWith('sw') && f.endsWith('.js'));
    expect(swFiles.length).toBeGreaterThan(0);
  });

  it('dist contains manifest.webmanifest', () => {
    const manifestPath = path.resolve(__dirname, '../../dist/manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);
  });
});
