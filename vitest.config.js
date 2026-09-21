import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.js',
      'tests/**/*.test.ts',
      // Unit tests for the shared compatibility-rules package.
      'packages/*/src/**/*.test.ts'
    ],
    testTimeout: 20000,
    hookTimeout: 20000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      // Resolve the shared rules package to its SOURCE, so the test run never
      // depends on packages/compat-rules/dist being built first.
      '@pc-kinba/compat-rules': path.resolve(__dirname, './packages/compat-rules/src/index.ts')
    }
  }
});

