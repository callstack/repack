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
  const compilationCounts = { ios: 0, android: 0 };

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
        watchOptions: { poll: 10 },
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
        watchOptions: { poll: 10 },
      },
    ];
  }

  describe('watchRun gate', () => {
    let compiler: Compiler;

    beforeAll(() => {
      compiler = new Compiler(createConfigs(), reporter, tmpDir);
      compiler.setDevServerContext(mockDevServerContext);
      for (const childCompiler of compiler.compiler.compilers) {
        const platform = childCompiler.options
          .name as keyof typeof compilationCounts;
        childCompiler.hooks.done.tap('test:count-builds', () => {
          compilationCounts[platform]++;
        });
      }
      compiler.start();
    });

    afterAll(async () => {
      await new Promise<void>((resolve, reject) => {
        compiler.close((error) => (error ? reject(error) : resolve()));
      });
    });

    it('rejects unconfigured platforms', async () => {
      await expect(
        compiler.getAsset('main.js', 'windows')
      ).rejects.toThrowError('Unrecognized platform: windows');
      expect(compilationCounts).toEqual({ ios: 0, android: 0 });
    });

    it('compiles each platform on demand and reuses cached assets', async () => {
      // Change source after both watchers are gated, then let polling observe it.
      await new Promise((resolve) => setTimeout(resolve, 100));
      fs.writeFileSync(entryPath, 'module.exports = { updated: true };');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const iosAsset = await compiler.getAsset('main.js', 'ios');
      // Give polling time to trigger any stale-timestamp rebuild.
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(iosAsset.data).toBeInstanceOf(Buffer);
      expect(compiler.statsCache.ios).toBeDefined();
      expect(compiler.statsCache.android).toBeUndefined();
      expect(compilationCounts).toEqual({ ios: 1, android: 0 });

      const androidAsset = await compiler.getAsset('main.js', 'android');

      expect(androidAsset.data).toBeInstanceOf(Buffer);
      expect(compiler.statsCache.android).toBeDefined();
      expect(compilationCounts).toEqual({ ios: 1, android: 1 });

      const cachedAsset = await compiler.getAsset('main.js', 'ios');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cachedAsset.data).toBeInstanceOf(Buffer);
      expect(compilationCounts).toEqual({ ios: 1, android: 1 });
    });
  });

  describe('close()', () => {
    it('rejects pending asset requests', async () => {
      const compiler = new Compiler(createConfigs(), reporter, tmpDir);
      compiler.setDevServerContext(mockDevServerContext);
      compiler.compiler.compilers[0].hooks.make.tapAsync(
        'test:hold-compilation',
        (_compilation, done) => setTimeout(done, 100)
      );
      compiler.start();

      const assetRequest = expect(
        compiler.getAsset('main.js', 'ios')
      ).rejects.toThrow('Compiler closed before compilation completed');
      await new Promise<void>((resolve, reject) => {
        compiler.close((error) => (error ? reject(error) : resolve()));
      });

      await assetRequest;
      await expect(compiler.getAsset('main.js', 'android')).rejects.toThrow(
        'Compiler closed before compilation completed'
      );
    });

    it('resolves when both platform gates are still held (no getAsset calls)', async () => {
      const compiler = new Compiler(createConfigs(), reporter, tmpDir);
      compiler.setDevServerContext(mockDevServerContext);
      compiler.start();

      // Gates are held for both platforms — close() should release them
      await new Promise<void>((resolve, reject) => {
        compiler.close((error) => (error ? reject(error) : resolve()));
      });
    });

    it('forwards compiler close errors to the caller', async () => {
      const compiler = new Compiler(createConfigs(), reporter, tmpDir);
      const closeError = new Error('close failed');
      jest
        .spyOn(compiler.compiler, 'close')
        .mockImplementation((callback) => callback(closeError));

      await expect(
        new Promise<void>((resolve, reject) => {
          compiler.close((error) => (error ? reject(error) : resolve()));
        })
      ).rejects.toBe(closeError);
    });
  });
});
