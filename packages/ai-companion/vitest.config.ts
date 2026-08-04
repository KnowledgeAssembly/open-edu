import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/__tests__/test-setup.ts', 'src/__tests__/jsdom-setup.ts'],
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 75,
        lines: 75,
      },
      exclude: ['dist/**', '**/*.test.*', '**/__fixtures__/**', '**/test-setup.*'],
    },
  },
});
