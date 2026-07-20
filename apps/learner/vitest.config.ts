import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const PKGS_DIR = resolve(__dirname, '../../packages');

const VIRTUAL_MODULE_ID = 'virtual:edu-data';
const RESOLVED_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

function virtualEduDataPlugin() {
  return {
    name: 'virtual-edu-data',
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_MODULE_ID;
    },
    load(id: string) {
      if (id === RESOLVED_MODULE_ID) {
        return `
export const catalogPackages = [];
export const packageEntries = {};
export const catalogBundles = [];
export const bundleEntries = {};
`;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), virtualEduDataPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@open-edu/storage': resolve(PKGS_DIR, 'storage/src/index.ts'),
      '@open-edu/pwa-core': resolve(PKGS_DIR, 'pwa-core/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
