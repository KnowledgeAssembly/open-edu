import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA configuration', () => {
  it('has a web manifest at public/manifest.webmanifest', () => {
    const manifestPath = path.resolve(__dirname, '../../public/manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('OpenEdu');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
  });

  it('index.html has manifest link and theme-color meta', () => {
    const htmlPath = path.resolve(__dirname, '../../index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('manifest.webmanifest');
    expect(html).toContain('theme-color');
  });

  it('icons are present in public directory', () => {
    const icon192 = path.resolve(__dirname, '../../public/icon-192.png');
    const icon512 = path.resolve(__dirname, '../../public/icon-512.png');
    const iconMaskable = path.resolve(__dirname, '../../public/icon-maskable.png');
    expect(fs.existsSync(icon192)).toBe(true);
    expect(fs.existsSync(icon512)).toBe(true);
    expect(fs.existsSync(iconMaskable)).toBe(true);
  });
});
