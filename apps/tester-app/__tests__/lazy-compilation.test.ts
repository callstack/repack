import fs from 'node:fs';
import path from 'node:path';
import rspackCommands from '@callstack/repack/commands/rspack';
import getPort from 'get-port';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TMP_DIR = path.join(__dirname, 'out/lazy-compilation');

let port: number;
let stopServer: () => Promise<void>;

describe('lazy compilation', () => {
  const startCommand = rspackCommands.find(
    (command) => command.name === 'start'
  );
  if (!startCommand) throw new Error('start command not found');

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
    await stopServer();
  });

  it(
    'stats API returns null for both platforms before any bundle is requested',
    async () => {
      const iosStats = await fetch(
        `http://localhost:${port}/api/ios/stats`
      ).then((r) => r.json());
      const androidStats = await fetch(
        `http://localhost:${port}/api/android/stats`
      ).then((r) => r.json());

      expect(iosStats.data).toBeNull();
      expect(androidStats.data).toBeNull();
    },
    60 * 1000
  );

  it(
    'GET /index.bundle?platform=ios produces ios stats but android stats remain null',
    async () => {
      const response = await fetch(
        `http://localhost:${port}/index.bundle?platform=ios`
      );
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThan(100000);

      const iosStats = await fetch(
        `http://localhost:${port}/api/ios/stats`
      ).then((r) => r.json());
      const androidStats = await fetch(
        `http://localhost:${port}/api/android/stats`
      ).then((r) => r.json());

      expect(iosStats.data).not.toBeNull();
      expect(androidStats.data).toBeNull();
    },
    60 * 1000
  );

  it(
    'GET /index.bundle?platform=android produces android stats after ios is already compiled',
    async () => {
      const response = await fetch(
        `http://localhost:${port}/index.bundle?platform=android`
      );
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThan(100000);

      const androidStats = await fetch(
        `http://localhost:${port}/api/android/stats`
      ).then((r) => r.json());

      expect(androidStats.data).not.toBeNull();
    },
    60 * 1000
  );
});
