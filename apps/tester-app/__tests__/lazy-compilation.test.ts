import fs from 'node:fs';
import path from 'node:path';
import rspackCommands from '@callstack/repack/commands/rspack';
import { MultiCompiler } from '@rspack/core';
import getPort from 'get-port';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TMP_DIR = path.join(__dirname, 'out/lazy-compilation');

let port: number;
let stopServer: (() => Promise<void>) | undefined;

describe('lazy compilation', () => {
  const startCommand = rspackCommands.find(
    (command) => command.name === 'start'
  );
  if (!startCommand) throw new Error('start command not found');

  const getStats = (platform: string) =>
    fetch(`http://localhost:${port}/api/${platform}/stats`).then((response) =>
      response.json()
    );

  beforeAll(async () => {
    await fs.promises.rm(TMP_DIR, { recursive: true, force: true });

    port = await getPort();

    const config = {
      root: path.join(__dirname, '..'),
      platforms: { ios: {}, android: {} },
      reactNativePath: path.join(__dirname, '../node_modules/react-native'),
    };

    const args = {
      port,
      // No `platform` arg — both ios and android are configured,
      // which enables the lazy compilation watchRun gate mechanism.
      logFile: path.join(TMP_DIR, 'server.log'),
      webpackConfig: path.join(__dirname, 'configs', './rspack.config.mjs'),
    };

    // @ts-ignore
    const { stop } = await startCommand.func([], config, args);
    stopServer = stop;
  });

  afterAll(async () => {
    if (stopServer) {
      await stopServer();
    }
  });

  it(
    'compiles each platform when its bundle is first requested',
    async () => {
      const [initialIosStats, initialAndroidStats] = await Promise.all([
        getStats('ios'),
        getStats('android'),
      ]);
      expect(initialIosStats.data).toBeNull();
      expect(initialAndroidStats.data).toBeNull();

      const iosResponse = await fetch(
        `http://localhost:${port}/index.bundle?platform=ios`
      );
      await iosResponse.text();
      expect(iosResponse.status).toBe(200);

      const [iosStats, androidStats] = await Promise.all([
        getStats('ios'),
        getStats('android'),
      ]);
      expect(iosStats.data).not.toBeNull();
      expect(androidStats.data).toBeNull();

      const androidResponse = await fetch(
        `http://localhost:${port}/index.bundle?platform=android`
      );
      await androidResponse.text();
      expect(androidResponse.status).toBe(200);
      const finalAndroidStats = await getStats('android');
      expect(finalAndroidStats.data).not.toBeNull();
    },
    60 * 1000
  );

  it('stops the dev server when compiler shutdown fails', async () => {
    const stop = stopServer;
    if (!stop) throw new Error('Dev server was not started');

    const close = MultiCompiler.prototype.close;
    const closeError = new Error('close failed');
    MultiCompiler.prototype.close = function (callback) {
      close.call(this, () => callback(closeError));
    };

    try {
      await expect(stop()).rejects.toBe(closeError);
      await expect(fetch(`http://localhost:${port}/status`)).rejects.toThrow();
      stopServer = undefined;
    } finally {
      MultiCompiler.prototype.close = close;
    }
  });
});
