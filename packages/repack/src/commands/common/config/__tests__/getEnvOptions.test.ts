import type { EnvOptions } from '../../../../types.js';
import {
  defineRspackConfig,
  defineWebpackConfig,
} from '../../../../utils/defineConfig.js';
import { getEnvOptions } from '../getEnvOptions.js';

describe('getEnvOptions', () => {
  it('should return options for bundling', () => {
    expect(
      getEnvOptions({
        args: {
          platform: 'android',
          dev: false,
          bundleOutput: '/a/b/c/main.js',
          entryFile: 'main.js',
        },
        command: 'bundle',
        rootDir: '/x/y/z',
        reactNativePath: '/x/y/z/node_modules/react-native',
      })
    ).toEqual({
      context: '/x/y/z',
      entry: './main.js',
      minimize: true,
      mode: 'production',
      platform: 'android',
      reactNativePath: '/x/y/z/node_modules/react-native',
      bundleFilename: '/a/b/c/main.js',
      sourceMapFilename: undefined,
      assetsPath: undefined,
      // Always present so configs can read `env.argv?.standalone` safely.
      argv: { standalone: false },
    });

    expect(
      getEnvOptions({
        args: {
          platform: 'android',
          dev: true,
          bundleOutput: '/a/b/c/main.js',
          sourcemapOutput: '/a/b/c/main.js.map',
          assetsDest: '/a/b/c/assets',
          entryFile: '/x/y/z/src/main.js',
        },
        command: 'bundle',
        rootDir: '/x/y/z',
        reactNativePath: '/x/y/z/node_modules/react-native',
      })
    ).toEqual({
      context: '/x/y/z',
      entry: '/x/y/z/src/main.js',
      minimize: false,
      mode: 'development',
      platform: 'android',
      reactNativePath: '/x/y/z/node_modules/react-native',
      bundleFilename: '/a/b/c/main.js',
      sourceMapFilename: '/a/b/c/main.js.map',
      assetsPath: '/a/b/c/assets',
      argv: { standalone: false },
    });
  });

  it('should return options for developing', () => {
    expect(
      getEnvOptions({
        args: { host: 'localhost' },
        command: 'start',
        rootDir: '/x/y/z',
        reactNativePath: '/x/y/z/node_modules/react-native',
      })
    ).toEqual({
      context: '/x/y/z',
      mode: 'development',
      reactNativePath: '/x/y/z/node_modules/react-native',
      devServer: {
        host: 'localhost',
        port: 8081,
        hmr: true,
        https: undefined,
      },
      argv: { standalone: false },
    });

    expect(
      getEnvOptions({
        args: { host: 'local', port: 5000 },
        command: 'start',
        rootDir: '/x/y/z',
        reactNativePath: '/x/y/z/node_modules/react-native',
      })
    ).toEqual({
      context: '/x/y/z',
      mode: 'development',
      reactNativePath: '/x/y/z/node_modules/react-native',
      devServer: {
        host: 'local',
        port: 5000,
        hmr: true,
        https: undefined,
      },
      argv: { standalone: false },
    });
  });

  describe('argv pass-through (runtime-only flags)', () => {
    it('populates argv.standalone for bundle only when the flag is set', () => {
      const base = {
        platform: 'ios',
        dev: false,
      };
      expect(
        getEnvOptions({
          args: { ...base, standalone: true },
          command: 'bundle',
          rootDir: '/x/y/z',
          reactNativePath: '/rn',
        }).argv
      ).toEqual({ standalone: true });

      expect(
        getEnvOptions({
          args: base,
          command: 'bundle',
          rootDir: '/x/y/z',
          reactNativePath: '/rn',
        }).argv
      ).toEqual({ standalone: false });
    });

    it('populates argv.standalone for start only when the flag is set', () => {
      expect(
        getEnvOptions({
          args: { host: 'localhost', standalone: true },
          command: 'start',
          rootDir: '/x/y/z',
          reactNativePath: '/rn',
        }).argv
      ).toEqual({ standalone: true });

      expect(
        getEnvOptions({
          args: { host: 'localhost' },
          command: 'start',
          rootDir: '/x/y/z',
          reactNativePath: '/rn',
        }).argv
      ).toEqual({ standalone: false });
    });

    it('reaches config functions through both define channels, like platform', () => {
      // makeCompilerConfig calls the user's config fn with `{ ...env,
      // platform }` — the exact spread that carries `platform` must carry
      // `argv` to the defineRspackConfig/defineWebpackConfig channels.
      const env = getEnvOptions({
        args: { platform: 'ios', dev: false, standalone: true },
        command: 'bundle',
        rootDir: '/x/y/z',
        reactNativePath: '/rn',
      });
      const configEnv: EnvOptions = { ...env, platform: 'ios' };

      const seen: unknown[] = [];
      defineRspackConfig((e) => {
        seen.push(e.argv);
        return {};
      })(configEnv);
      defineWebpackConfig((e) => {
        seen.push(e.argv);
        return {};
      })(configEnv);

      expect(seen).toEqual([{ standalone: true }, { standalone: true }]);
    });
  });
});
