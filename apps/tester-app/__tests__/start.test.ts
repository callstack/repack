import path from 'node:path';
import fs from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import getPort from 'get-port';
import commands from '@callstack/repack/commands';

const [, start] = commands;
type Config = Parameters<typeof start.func>[1];
type Args = Parameters<typeof start.func>[2];

let port: number;
let stopServer: () => Promise<void>;

const TMP_DIR = path.join(__dirname, 'out/server-test-output');
const REACT_NATIVE_PATH = require.resolve('react-native', {
  paths: [path.dirname(__dirname)],
});
const RELATIVE_REACT_NATIVE_PATH = path.relative(
  path.join(__dirname, '..', '..', '..'),
  path.dirname(REACT_NATIVE_PATH)
);

describe('start command', () => {
  it("should be also available under 'webpack-start' alias", () => {
    const startCommand = commands.find((command) => command.name === 'start');
    const webpackStartCommand = commands.find(
      (command) => command.name === 'webpack-start'
    );

    expect(startCommand).toBeDefined();
    expect(webpackStartCommand).toBeDefined();
    expect(startCommand!.func).toEqual(webpackStartCommand!.func);
  });

  describe.each([
    {
      platform: 'ios',
      requests: [
        'index.bundle.map?platform=ios',
        'index.bundle.map?platform=ios',
        'ios/miniapp.chunk.bundle',
        'ios/miniapp.chunk.bundle.map',
        'ios/remote.chunk.bundle',
        'ios/remote.chunk.bundle.map',
        'ios/src_asyncChunks_Async_local_tsx.chunk.bundle',
        'ios/src_asyncChunks_Async_local_tsx.chunk.bundle.map',
        'assets/src/miniapp/callstack-dark.png?platform=ios',
        `assets/${RELATIVE_REACT_NATIVE_PATH}/Libraries/NewAppScreen/components/logo.png?platform=ios`,
      ],
    },
    {
      platform: 'android',
      requests: [
        'index.bundle.map?platform=android',
        'index.bundle.map?platform=android',
        'android/miniapp.chunk.bundle',
        'android/miniapp.chunk.bundle.map',
        'android/remote.chunk.bundle',
        'android/remote.chunk.bundle.map',
        'android/src_asyncChunks_Async_local_tsx.chunk.bundle',
        'android/src_asyncChunks_Async_local_tsx.chunk.bundle.map',
        'assets/src/miniapp/callstack-dark.png?platform=android',
        `assets/${RELATIVE_REACT_NATIVE_PATH}/Libraries/NewAppScreen/components/logo.png?platform=android`,
      ],
    },
  ])('should successfully produce bundle assets', ({ platform, requests }) => {
    beforeAll(async () => {
      await fs.promises.rm(TMP_DIR, {
        recursive: true,
        force: true,
      });

      port = await getPort();
      const config = {
        root: path.join(__dirname, '..'),
        reactNativePath: path.join(__dirname, '../node_modules/react-native'),
      };
      const args = {
        port,
        silent: true,
        logFile: path.join(TMP_DIR, 'server.log'),
        webpackConfig: path.join(__dirname, './webpack.config.mjs'),
      };

      const { stop } = await start.func([], config as Config, args as Args);
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
        expect((await response.text()).length).toBeGreaterThan(100000);

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
  });
});
