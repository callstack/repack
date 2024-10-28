import fs from 'node:fs';
import path from 'node:path';
import rspackCommands from '@callstack/repack/commands/rspack';
import webpackCommands from '@callstack/repack/commands/webpack';
import { globby } from 'globby';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const REACT_NATIVE_PATH = require.resolve('react-native', {
  paths: [path.dirname(__dirname)],
});
const RELATIVE_REACT_NATIVE_PATH = path.relative(
  path.join(__dirname, '..', '..', '..'),
  path.dirname(REACT_NATIVE_PATH)
);
const REACT_NATIVE_ANDROID_ASSET_PATH = RELATIVE_REACT_NATIVE_PATH.replaceAll(
  path.sep,
  '_'
).replaceAll(/[-.@+=]/g, '');

describe('bundle command', () => {
  describe.each([
    {
      bundler: 'webpack',
      commands: webpackCommands,
      configFile: './webpack.config.mjs',
    },
    {
      bundler: 'rspack',
      commands: rspackCommands,
      configFile: './rspack.config.mjs',
    },
  ])('using $bundler', ({ bundler, commands, configFile }) => {
    const bundleCommand = commands.find((command) => command.name === 'bundle');
    if (!bundleCommand) throw new Error('bundle command not found');

    it("should be also available under 'webpack-bundle' alias", () => {
      const webpackBundleCommand = commands.find(
        (command) => command.name === 'webpack-bundle'
      );

      expect(webpackBundleCommand).toBeDefined();
      const { description, func, options } = webpackBundleCommand!;

      expect(bundleCommand.description).toEqual(description);
      expect(bundleCommand.options).toEqual(options);
      expect(bundleCommand.func).toEqual(func);
    });

    describe.each([
      {
        platform: 'ios',
        assets: [
          'index.bundle',
          'index.bundle.map',
          'miniapp.chunk.bundle',
          'miniapp.chunk.bundle.map',
          'remote.chunk.bundle',
          'remote.chunk.bundle.map',
          'src_asyncChunks_Async_local_tsx.chunk.bundle',
          'src_asyncChunks_Async_local_tsx.chunk.bundle.map',
          'react-native-bundle-output/main.jsbundle',
          'react-native-bundle-output/main.jsbundle.map',
          'react-native-bundle-output/src_asyncChunks_Async_local_tsx.chunk.bundle',
          'react-native-bundle-output/src_asyncChunks_Async_local_tsx.chunk.bundle.map',
          'assets/src/miniapp/callstack-dark.png',
          `assets/${RELATIVE_REACT_NATIVE_PATH}/Libraries/NewAppScreen/components/logo.png`,
          'assets/src/assetsTest/localAssets/webpack.png',
          'assets/src/assetsTest/localAssets/webpack@2x.png',
          'assets/src/assetsTest/localAssets/webpack@3x.png',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack.png',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack@2x.png',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack@3x.png',
          'react-native-bundle-output/assets/src/assetsTest/localAssets/webpack.png',
          'react-native-bundle-output/assets/src/assetsTest/localAssets/webpack@2x.png',
          'react-native-bundle-output/assets/src/assetsTest/localAssets/webpack@3x.png',
          `react-native-bundle-output/assets/${RELATIVE_REACT_NATIVE_PATH}/Libraries/NewAppScreen/components/logo.png`,
        ],
      },
      {
        platform: 'android',
        assets: [
          'index.bundle',
          'index.bundle.map',
          'miniapp.chunk.bundle',
          'miniapp.chunk.bundle.map',
          'remote.chunk.bundle',
          'remote.chunk.bundle.map',
          'src_asyncChunks_Async_local_tsx.chunk.bundle',
          'src_asyncChunks_Async_local_tsx.chunk.bundle.map',
          `drawable-mdpi/${REACT_NATIVE_ANDROID_ASSET_PATH}_libraries_newappscreen_components_logo.png`,
          'drawable-mdpi/src_assetstest_localassets_webpack.png',
          'drawable-xxhdpi/src_assetstest_localassets_webpack.png',
          'drawable-xhdpi/src_assetstest_localassets_webpack.png',
          'drawable-mdpi/src_miniapp_callstackdark.png',
          'react-native-bundle-output/index.android.bundle',
          'react-native-bundle-output/index.android.bundle.map',
          'react-native-bundle-output/src_asyncChunks_Async_local_tsx.chunk.bundle',
          'react-native-bundle-output/src_asyncChunks_Async_local_tsx.chunk.bundle.map',
          `react-native-bundle-output/drawable-mdpi/${REACT_NATIVE_ANDROID_ASSET_PATH}_libraries_newappscreen_components_logo.png`,
          'react-native-bundle-output/drawable-mdpi/src_assetstest_localassets_webpack.png',
          'react-native-bundle-output/drawable-xxhdpi/src_assetstest_localassets_webpack.png',
          'react-native-bundle-output/drawable-xhdpi/src_assetstest_localassets_webpack.png',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack.png',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack@2x.png',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack@3x.png',
        ],
      },
    ])('should successfully produce bundle assets', ({ platform, assets }) => {
      const TMP_DIR = path.join(__dirname, `out/bundle/${bundler}/${platform}`);

      beforeAll(async () => {
        await fs.promises.rm(TMP_DIR, {
          recursive: true,
          force: true,
        });
      });

      afterEach(() => {
        process.env.TEST_WEBPACK_OUTPUT_DIR = undefined;
      });

      it(
        `for ${platform}`,
        async () => {
          const config = {
            root: path.join(__dirname, '..'),
            platforms: { ios: {}, android: {} },
            reactNativePath: path.join(
              __dirname,
              '../node_modules/react-native'
            ),
          };

          const args = {
            platform,
            entryFile: 'index.js',
            bundleOutput: path.join(
              TMP_DIR,
              'react-native-bundle-output',
              platform === 'ios' ? 'main.jsbundle' : `index.${platform}.bundle`
            ),
            dev: false,
            webpackConfig: path.join(__dirname, 'configs', configFile),
          };
          process.env.TEST_WEBPACK_OUTPUT_DIR = TMP_DIR;

          // @ts-ignore
          await bundleCommand.func([''], config, args);

          const files = await globby(['**/*'], { cwd: TMP_DIR, dot: true });
          expect(files.sort()).toEqual(assets.sort());
        },
        60 * 1000
      );
    });
  });
});
