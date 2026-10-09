import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundle } from '../bundle.js';
import { start } from '../start.js';
import type { CliConfig } from '../types.js';

const cliConfigFor = (root: string): CliConfig => ({
  root,
  platforms: ['ios'],
  reactNativePath: '/project/node_modules/react-native',
});

function workspaceWith(config: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-standalone-'));
  fs.writeFileSync(
    path.join(dir, 'repack-federation.json'),
    JSON.stringify(config, null, 2)
  );
  return dir;
}

// No bundler config lives in these workspaces: when the standalone guard
// PASSES, the command proceeds and fails later on config discovery — a
// different message, which is exactly what distinguishes "proceeded" from
// "refused" without mocking the whole compiler stack.
const UNSUPPORTED = () =>
  workspaceWith({
    host: { manifest: './build' },
    remotes: { mini: { manifest: './mini/build' } },
  });

const SUPPORTED = () =>
  workspaceWith({
    host: { manifest: './build' },
    remotes: { mini: { manifest: './mini/build', standalone: true } },
  });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('start/bundle --standalone refusal wiring', () => {
  it('bundle refuses an unsupported remote before touching the compiler', async () => {
    const root = UNSUPPORTED();
    try {
      await expect(
        bundle([], cliConfigFor(root), {
          platform: 'ios',
          dev: false,
          standalone: true,
        })
      ).rejects.toThrow(
        '--standalone refused: remote "mini" does not declare standalone support'
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('start refuses the same way', async () => {
    const root = UNSUPPORTED();
    try {
      await expect(
        start([], cliConfigFor(root), {
          host: 'localhost',
          standalone: true,
        })
      ).rejects.toThrow('--standalone refused');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('bundle proceeds past the guard when --standalone was never requested', async () => {
    const root = UNSUPPORTED();
    try {
      await expect(
        bundle([], cliConfigFor(root), { platform: 'ios', dev: false })
      ).rejects.toThrow(/configuration file/i);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('bundle proceeds past the guard for a remote declaring standalone: true', async () => {
    const root = SUPPORTED();
    try {
      await expect(
        bundle([], cliConfigFor(root), {
          platform: 'ios',
          dev: false,
          standalone: true,
        })
      ).rejects.toThrow(/configuration file/i);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
