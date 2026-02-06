import { basename, dirname, join } from 'node:path';
import { defineConfig } from 'vitest/config';
import type { BundlerType } from './src/helpers.js';

export default defineConfig({
  test: {
    // Store snapshots in separate directories per bundler for easier review
    // e.g. __snapshots__/rspack/test.ts.snap, __snapshots__/webpack/test.ts.snap
    resolveSnapshotPath(testPath, snapExtension, context) {
      const projectName = context.config.name ?? 'default';
      return join(
        dirname(testPath),
        '__snapshots__',
        projectName,
        basename(testPath) + snapExtension
      );
    },
    projects: [
      {
        test: {
          name: 'rspack',
          include: ['src/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30_000,
          provide: {
            bundlerType: 'rspack' satisfies BundlerType,
          },
        },
      },
      {
        test: {
          name: 'webpack',
          include: ['src/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30_000,
          provide: {
            bundlerType: 'webpack' satisfies BundlerType,
          },
        },
      },
    ],
  },
});
