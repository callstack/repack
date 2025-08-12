import fs from 'node:fs';
import path from 'node:path';
import rspackCommands from '@callstack/repack/commands/rspack';
import webpackCommands from '@callstack/repack/commands/webpack';
import { globby } from 'globby';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('hermes bytecode', () => {
  beforeEach(() => {
    // reset test env each case, we pass dir explicitly inside
    vi.unstubAllEnvs();
  });

  const matrix = [
    { bundler: 'webpack', platform: 'ios' },
    { bundler: 'webpack', platform: 'android' },
    { bundler: 'rspack', platform: 'ios' },
    { bundler: 'rspack', platform: 'android' },
  ] as const;

  it.each(matrix)(
    'transforms JS to Hermes bytecode using $bundler on $platform',
    async ({ bundler, platform }) => {
      const commands = bundler === 'webpack' ? webpackCommands : rspackCommands;
      const bundleCommand = commands.find(
        (command) => command.name === 'bundle'
      );
      if (!bundleCommand) throw new Error('bundle command not found');

      const BASE_DIR = path.join(
        __dirname,
        `out/hermes/${bundler}/${platform}`
      );
      const TMP_DIR_NO = path.join(BASE_DIR, 'no-hermes');
      const TMP_DIR_HBC = path.join(BASE_DIR, 'hermes');

      await fs.promises.rm(BASE_DIR, { recursive: true, force: true });

      const config = {
        root: path.join(__dirname, '..'),
        platforms: { ios: {}, android: {} },
        reactNativePath: path.join(__dirname, '../node_modules/react-native'),
      };

      const makeBundle = async (configFile: string, outDir: string) => {
        const bundleOutputPath = path.join(
          outDir,
          'react-native-bundle-output',
          platform === 'ios' ? 'main.jsbundle' : `index.${platform}.bundle`
        );
        vi.stubEnv('TEST_WEBPACK_OUTPUT_DIR', outDir);
        vi.stubEnv('REPACK_BUNDLE_FILENAME', bundleOutputPath);
        const args = {
          platform,
          config: path.join(__dirname, 'configs', configFile),
          entryFile: 'index.js',
          bundleOutput: bundleOutputPath,
          dev: false,
        } as const;
        // @ts-ignore
        await bundleCommand.func([''], config, args);
        // Return map of chunk file -> content
        const chunks = await globby(['**/*.chunk.bundle'], {
          cwd: outDir,
          dot: true,
        });
        const entries = await Promise.all(
          chunks.map(
            async (file) =>
              [
                file,
                await fs.promises.readFile(path.join(outDir, file)),
              ] as const
          )
        );
        return Object.fromEntries(entries);
      };

      const jsAssets = await makeBundle(`${bundler}.config.mjs`, TMP_DIR_NO);
      const hermesAssets = await makeBundle(
        `hermes/${bundler}.config.mjs`,
        TMP_DIR_HBC
      );

      // Ensure we have common chunk file(s)
      expect(jsAssets.length).toEqual(hermesAssets.length);

      for (const [file, jsContent] of Object.entries(jsAssets)) {
        const hermesContent = hermesAssets[file];
        expect(hermesAssets[file]).toBeDefined();
        expect(jsContent).not.toEqual(hermesContent);
      }
    },
    60 * 1000
  );
});
