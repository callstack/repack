import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30_000,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
