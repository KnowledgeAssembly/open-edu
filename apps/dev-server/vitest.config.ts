import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'resolve-virtual-module',
      resolveId(id: string) {
        if (id === 'virtual:open-edu-package') return '\0virtual:open-edu-package';
      },
      load(id: string) {
        if (id === '\0virtual:open-edu-package') {
          return 'export const packageData = null;';
        }
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
