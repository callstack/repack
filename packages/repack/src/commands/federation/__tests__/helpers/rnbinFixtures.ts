import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Runtime-generated stand-in installs for `resolveReactNativeBin`, built
 * under `os.tmpdir()` instead of a committed fixture tree: a fixture
 * `node_modules/` directory is gitignored by definition, so a committed
 * tree would only exist on machines that ran `pnpm install` and CI would
 * fall back to the repo's REAL react-native through Node's upward walk.
 */
export interface RnbinFixtures {
  /** realpath'd tmp root; every other path lives under it. */
  root: string;
  /** Plain install: node_modules/react-native/cli.js. */
  appRoot: string;
  /** pnpm-style install: node_modules/react-native is a REAL SYMLINK
   * into .pnpm/react-native@100.0.0/node_modules/react-native (whose CLI
   * sits at scripts/cli.js). Absent when the platform refuses symlinks —
   * then a plain directory takes its place, so resolution still lands
   * inside pnpmAppRoot but symlink-following is not proven. */
  pnpmAppRoot: string;
  /** Realpath of the CLI the pnpm app resolves to (the .pnpm target). */
  pnpmCliRealpath: string;
  /** Where it is declared when symlinks are unavailable (null otherwise). */
  pnpmFallbackDir: string | null;
  /** Empty app dir: no react-native anywhere under it (or under root). */
  noRoot: string;
  /** False when fs.symlinkSync failed — symlink-specific tests skip. */
  symlinkSupported: boolean;
  cleanup: () => void;
}

/** Node resolves `paths: [root]` by walking ancestors too: a tmpdir with a
 * node_modules/react-native above it would silently satisfy a "missing"
 * resolution, so refuse to build on such a machine. */
function assertNoAncestorReactNative(dir: string) {
  let current = path.parse(dir).root;
  const parts = path.relative(current, dir).split(path.sep).filter(Boolean);
  const visited = [current];
  for (const part of parts) {
    current = path.join(current, part);
    visited.push(current);
  }
  for (const ancestor of visited) {
    if (fs.existsSync(path.join(ancestor, 'node_modules', 'react-native'))) {
      throw new Error(
        `Cannot build rnbin fixtures: ${ancestor} has an ancestor ` +
          'node_modules/react-native that would shadow the fixture roots.'
      );
    }
  }
}

/** One-shot probe: some CI boxes (Windows without developer mode) refuse
 * symlink creation — symlink-shaped tests skip there instead of flaking. */
export function canSymlink(): boolean {
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-symlink-'));
  try {
    fs.mkdirSync(path.join(probe, 'target'));
    fs.symlinkSync(
      'target',
      path.join(probe, 'link'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(probe, { recursive: true, force: true });
  }
}

export function createRnbinFixtures(): RnbinFixtures {
  const tmpRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-rnbin-'))
  );
  assertNoAncestorReactNative(tmpRoot);

  const appRoot = path.join(tmpRoot, 'app');
  const appPackageDir = path.join(appRoot, 'node_modules', 'react-native');
  fs.mkdirSync(appPackageDir, { recursive: true });
  fs.writeFileSync(
    path.join(appPackageDir, 'package.json'),
    JSON.stringify({
      name: 'react-native',
      version: '100.0.0',
      bin: { 'react-native': './cli.js' },
    })
  );
  fs.writeFileSync(path.join(appPackageDir, 'cli.js'), '#!/usr/bin/env node\n');

  const pnpmAppRoot = path.join(tmpRoot, 'pnpmapp');
  const pnpmTargetDir = path.join(
    pnpmAppRoot,
    'node_modules',
    '.pnpm',
    'react-native@100.0.0',
    'node_modules',
    'react-native'
  );
  fs.mkdirSync(path.join(pnpmTargetDir, 'scripts'), { recursive: true });
  fs.writeFileSync(
    path.join(pnpmTargetDir, 'package.json'),
    JSON.stringify({
      name: 'react-native',
      version: '100.0.0',
      bin: { 'react-native': './scripts/cli.js' },
    })
  );
  fs.writeFileSync(
    path.join(pnpmTargetDir, 'scripts', 'cli.js'),
    '#!/usr/bin/env node\n'
  );

  let symlinkSupported = true;
  let pnpmFallbackDir: string | null = null;
  try {
    fs.symlinkSync(
      path.join(
        '.pnpm',
        'react-native@100.0.0',
        'node_modules',
        'react-native'
      ),
      path.join(pnpmAppRoot, 'node_modules', 'react-native'),
      'junction'
    );
  } catch {
    // Windows without developer mode / symlink privileges: fall back to a
    // real directory so resolution still lands in this app's install, and
    // let symlink-specific tests skip instead of flaking CI.
    symlinkSupported = false;
    pnpmFallbackDir = path.join(pnpmAppRoot, 'node_modules', 'react-native');
    fs.mkdirSync(pnpmFallbackDir, { recursive: true });
    fs.writeFileSync(
      path.join(pnpmFallbackDir, 'package.json'),
      JSON.stringify({
        name: 'react-native',
        version: '100.0.0',
        bin: { 'react-native': './scripts/cli.js' },
      })
    );
    fs.mkdirSync(path.join(pnpmFallbackDir, 'scripts'), { recursive: true });
    fs.writeFileSync(
      path.join(pnpmFallbackDir, 'scripts', 'cli.js'),
      '#!/usr/bin/env node\n'
    );
  }

  const noRoot = path.join(tmpRoot, 'noroot');
  fs.mkdirSync(noRoot, { recursive: true });

  return {
    root: tmpRoot,
    appRoot,
    pnpmAppRoot,
    pnpmCliRealpath: path.join(pnpmTargetDir, 'scripts', 'cli.js'),
    pnpmFallbackDir,
    noRoot,
    symlinkSupported,
    cleanup: () => fs.rmSync(tmpRoot, { recursive: true, force: true }),
  };
}
