import fs from 'node:fs';
import path from 'node:path';
import rspackCommands from '@callstack/repack/commands/rspack';
import webpackCommands from '@callstack/repack/commands/webpack';
import getPort from 'get-port';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let port: number;
let stopServer: () => Promise<void>;

const REACT_NATIVE_PATH = require.resolve('react-native', {
  paths: [path.dirname(__dirname)],
});
const RELATIVE_REACT_NATIVE_PATH = path.relative(
  path.join(__dirname, '..', '..', '..'),
  path.dirname(REACT_NATIVE_PATH)
);

describe('start command', () => {
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
    const startCommand = commands.find((command) => command.name === 'start');
    if (!startCommand) throw new Error('start command not found');

    it("should be also available under 'webpack-start' alias", () => {
      const webpackStartCommand = commands.find(
        (command) => command.name === 'webpack-start'
      );

      expect(webpackStartCommand).toBeDefined();
      const { description, func, options } = webpackStartCommand!;

      expect(startCommand.description).toEqual(description);
      expect(startCommand.options).toEqual(options);
      expect(startCommand.func).toEqual(func);
    });

    describe.each([
      {
        platform: 'ios',
        requests: [
          'index.bundle?platform=ios',
          'index.bundle.map?platform=ios',
          'ios/miniapp.chunk.bundle',
          'ios/miniapp.chunk.bundle.map',
          'ios/remote.chunk.bundle',
          'ios/remote.chunk.bundle.map',
          'ios/src_asyncChunks_Async_local_tsx.chunk.bundle',
          'ios/src_asyncChunks_Async_local_tsx.chunk.bundle.map',
          'assets/src/miniapp/callstack-dark.png?platform=ios',
          `assets/${RELATIVE_REACT_NATIVE_PATH}/Libraries/NewAppScreen/components/logo.png?platform=ios`,
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack.png?platform=ios',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack@2x.png?platform=ios',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack@3x.png?platform=ios',
          'index.js',
          'src/App.tsx',
          'src/ui/undraw_Developer_activity_re_39tg.svg',
        ],
      },
      {
        platform: 'android',
        requests: [
          'index.bundle?platform=android',
          'index.bundle.map?platform=android',
          'android/miniapp.chunk.bundle',
          'android/miniapp.chunk.bundle.map',
          'android/remote.chunk.bundle',
          'android/remote.chunk.bundle.map',
          'android/src_asyncChunks_Async_local_tsx.chunk.bundle',
          'android/src_asyncChunks_Async_local_tsx.chunk.bundle.map',
          'assets/src/miniapp/callstack-dark.png?platform=android',
          `assets/${RELATIVE_REACT_NATIVE_PATH}/Libraries/NewAppScreen/components/logo.png?platform=android`,
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack.png?platform=android',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack@2x.png?platform=android',
          'remote-assets/assets/src/assetsTest/remoteAssets/webpack@3x.png?platform=android',
          'index.js',
          'src/App.tsx',
          'src/ui/undraw_Developer_activity_re_39tg.svg',
        ],
      },
    ])(
      'should successfully produce bundle assets',
      ({ platform, requests }) => {
        const TMP_DIR = path.join(
          __dirname,
          `out/start/${bundler}/${platform}`
        );

        beforeAll(async () => {
          await fs.promises.rm(TMP_DIR, {
            recursive: true,
            force: true,
          });

          port = await getPort();

          const config = {
            root: path.join(__dirname, '..'),
            platforms: { ios: {}, android: {} },
            reactNativePath: path.join(
              __dirname,
              '../node_modules/react-native'
            ),
          };

          const args = {
            port,
            platform,
            logFile: path.join(TMP_DIR, 'server.log'),
            webpackConfig: path.join(__dirname, 'configs', configFile),
          };

          // @ts-ignore
          const { stop } = await startCommand.func([], config, args);
          stopServer = stop;
        });

        afterAll(async () => {
          await stopServer();
        });

        it(
          `for ${platform}`,
          async () => {
            let response = await fetch(`http://localhost:${port}/`);
            await expect(response.text()).resolves.toEqual(
              'React Native packager is running'
            );

            const [bundleRequest, ...assetsRequests] = requests;

            response = await fetch(`http://localhost:${port}/${bundleRequest}`);

            const responseText = await response.text();
            if (responseText.length < 100000) {
              console.log(response, responseText);
            }
            expect(responseText.length).toBeGreaterThan(100000);

            const responses = await Promise.all(
              assetsRequests.map((asset) =>
                fetch(`http://localhost:${port}/${asset}`)
              )
            );

            responses.forEach((response) => {
              if (!response.ok) {
                console.log(response);
              }
              expect(response.ok).toBe(true);
            });

            (
              await Promise.all(responses.map((response) => response.text()))
            ).forEach((text) => {
              expect(text.length).toBeGreaterThan(0);
            });
          },
          60 * 1000
        );
      }
    );
  });
});
