import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Server } from '@callstack/repack-dev-server';
import type { MultiRspackOptions } from '@rspack/core';
import type { Reporter } from '../../../logging/types.js';
import { Compiler } from '../Compiler.js';

// Mock adb reverse to avoid calling adb during tests
jest.mock('../../common/runAdbReverse.js', () => ({
  runAdbReverse: jest.fn().mockResolvedValue(undefined),
}));

describe('Compiler – lazy compilation', () => {
  let tmpDir: string;
  let entryPath: string;

  const reporter: Reporter = {
    process: jest.fn(),
    flush: jest.fn(),
    stop: jest.fn(),
  };

  const mockDevServerContext: Server.DelegateContext = {
    options: { port: 8081 } as Server.DelegateContext['options'],
    log: {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as Server.DelegateContext['log'],
    notifyBuildStart: jest.fn(),
    notifyBuildEnd: jest.fn(),
    broadcastToHmrClients: jest.fn(),
    broadcastToMessageClients: jest.fn(),
  };

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-compiler-test-'));
    entryPath = path.join(tmpDir, 'entry.js');
    fs.writeFileSync(entryPath, 'module.exports = {};');
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createConfigs(): MultiRspackOptions {
    return [
      {
        name: 'ios',
        mode: 'development',
        entry: entryPath,
        output: { filename: 'main.js', path: path.join(tmpDir, 'out-ios') },
        plugins: [],
      },
      {
        name: 'android',
        mode: 'development',
        entry: entryPath,
        output: {
          filename: 'main.js',
          path: path.join(tmpDir, 'out-android'),
        },
        plugins: [],
      },
    ];
  }

  describe('watchRun gate', () => {
    let compiler: Compiler;

    beforeAll(() => {
      compiler = new Compiler(createConfigs(), reporter, tmpDir);
      compiler.setDevServerContext(mockDevServerContext);
      compiler.start();
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => compiler.close(resolve));
    });

    it('getAsset("main.js", "ios") produces ios stats but leaves android stats undefined', async () => {
      const asset = await compiler.getAsset('main.js', 'ios');

      expect(asset).toBeDefined();
      expect(asset.data).toBeInstanceOf(Buffer);
      expect(compiler.statsCache.ios).toBeDefined();
      expect(compiler.statsCache.android).toBeUndefined();
    });

    it('getAsset("main.js", "android") produces android stats independently of ios', async () => {
      const asset = await compiler.getAsset('main.js', 'android');

      expect(asset).toBeDefined();
      expect(asset.data).toBeInstanceOf(Buffer);
      expect(compiler.statsCache.android).toBeDefined();
    });

    it('getAsset for an already-compiled platform resolves from cache without recompilation', async () => {
      // Both platforms are already compiled from previous tests
      const asset = await compiler.getAsset('main.js', 'ios');

      expect(asset).toBeDefined();
      expect(asset.data).toBeInstanceOf(Buffer);
    });
  });

  describe('close()', () => {
    it('resolves when both platform gates are still held (no getAsset calls)', async () => {
      const compiler = new Compiler(createConfigs(), reporter, tmpDir);
      compiler.setDevServerContext(mockDevServerContext);
      compiler.start();

      // Gates are held for both platforms — close() should release them
      await new Promise<void>((resolve) => compiler.close(resolve));
    });
  });
});
