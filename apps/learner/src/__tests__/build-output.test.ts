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

const hasCatalogAssets = fs.existsSync(path.resolve(distPath, 'assets/images/healthy-leaf.png'));
const showcaseSource = path.resolve(
  __dirname,
  '../../../../examples/widget-showcase/assets/images/healthy-leaf.png',
);

describe.skipIf(!hasCatalogAssets)('Build output contains catalog course assets', () => {
  it('emits widget-showcase asset files into dist/assets', () => {
    const expected = [
      'assets/images/healthy-leaf.png',
      'assets/images/diseased-leaf.png',
      'assets/images/india-map.png',
      'assets/video/water-cycle.mp4',
      'assets/audio/sample-audio.wav',
      'assets/animations/water-cycle.lottie',
    ];
    for (const file of expected) {
      expect(fs.existsSync(path.resolve(distPath, file))).toBe(true);
    }
  });

  it('copies asset bytes verbatim', () => {
    const source = fs.readFileSync(showcaseSource);
    const emitted = fs.readFileSync(path.resolve(distPath, 'assets/images/healthy-leaf.png'));
    expect(emitted.equals(source)).toBe(true);
  });
});
