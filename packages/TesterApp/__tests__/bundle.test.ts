import path from 'path';
import fs from 'fs';
import { globby } from 'globby';
import { describe, it, afterEach, beforeAll, expect } from 'vitest';
import commands from '@callstack/repack/commands';

const [bundle] = commands;
type Config = Parameters<typeof bundle.func>[1];
type Args = Parameters<typeof bundle.func>[2];

const TMP_DIR = path.join(__dirname, 'out/bundle-test-output');

beforeAll(async () => {
  await fs.promises.rm(TMP_DIR, {
    recursive: true,
    force: true,
  });
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
      'src_asyncChunks_Async_tsx.chunk.bundle',
      'src_asyncChunks_Async_tsx.chunk.bundle.map',
      'react-native-bundle-output/main.jsbundle',
      'react-native-bundle-output/main.jsbundle.map',
      'react-native-bundle-output/src_asyncChunks_Async_tsx.chunk.bundle',
      'react-native-bundle-output/src_asyncChunks_Async_tsx.chunk.bundle.map',
      'assets/src/miniapp/callstack-dark.png',
      'assets/node_modules/react-native/Libraries/NewAppScreen/components/logo.png',
      'react-native-bundle-output/assets/node_modules/react-native/Libraries/NewAppScreen/components/logo.png',
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
      'src_asyncChunks_Async_tsx.chunk.bundle',
      'src_asyncChunks_Async_tsx.chunk.bundle.map',
      'drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png',
      'drawable-mdpi/src_miniapp_callstackdark.png',
      'react-native-bundle-output/index.android.bundle',
      'react-native-bundle-output/index.android.bundle.map',
      'react-native-bundle-output/src_asyncChunks_Async_tsx.chunk.bundle',
      'react-native-bundle-output/src_asyncChunks_Async_tsx.chunk.bundle.map',
      'react-native-bundle-output/drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png',
    ],
  },
])(
  'bundle command should successfully produce bundle assets',
  ({ platform, assets }) => {
    afterEach(() => {
      delete process.env.TEST_WEBPACK_OUTPUT_PATH;
    });

    it(
      `for ${platform}`,
      async () => {
        const OUTPUT_DIR = path.join(TMP_DIR, platform);
        const config = {
          root: path.join(__dirname, '..'),
          reactNativePath: path.join(__dirname, '../node_modules/react-native'),
        };
        const args = {
          platform,
          entryFile: 'index.js',
          bundleOutput: path.join(
            OUTPUT_DIR,
            'react-native-bundle-output',
            platform === 'ios' ? 'main.jsbundle' : `index.${platform}.bundle`
          ),
          dev: false,
          webpackConfig: path.join(__dirname, './webpack.config.mjs'),
        };
        process.env.TEST_WEBPACK_OUTPUT_DIR = OUTPUT_DIR;

        await bundle.func([''], config as Config, args as Args);

        const files = await globby([`**/*`], { cwd: OUTPUT_DIR });
        expect(files).toEqual(assets);
      },
      60 * 1000
    );
  }
);
