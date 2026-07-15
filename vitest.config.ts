import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts'],
    // The visual test self-skips when LibreOffice is absent (see it.skipIf).
    exclude: ['node_modules/**', '**/dist/**'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
