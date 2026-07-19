import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Service Worker registration', () => {
  it('vite.config.ts imports VitePWA', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('VitePWA');
    expect(config).toContain('vite-plugin-pwa');
  });

  it('vite.config.ts has registerType autoUpdate', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('autoUpdate');
  });

  it('vite.config.ts has workbox config with navigateFallback', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('workbox');
    expect(config).toContain('navigateFallback');
  });

  it('vite.config.ts has runtime caching rules', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('NetworkFirst');
    expect(config).toContain('CacheFirst');
  });
});
