import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CLIError } from '../../../helpers/index.js';
import { resolveReactNativeBin } from '../rnBin.js';
import {
  canSymlink,
  createRnbinFixtures,
  type RnbinFixtures,
} from './helpers/rnbinFixtures.js';

// Stand-in installs are generated at runtime under os.tmpdir(): a fixture
// node_modules/ tree is gitignored by definition, so a committed one would
// be missing on CI and resolution would walk up to the repo's REAL
// react-native, silently testing the wrong package.
let fixtures: RnbinFixtures;

beforeAll(() => {
  fixtures = createRnbinFixtures();
});

afterAll(() => {
  fixtures.cleanup();
});

describe('resolveReactNativeBin', () => {
  it('resolves the local package cli.js to an absolute existing path', () => {
    const bin = resolveReactNativeBin(fixtures.appRoot);
    expect(bin).toBe(
      path.join(fixtures.appRoot, 'node_modules', 'react-native', 'cli.js')
    );
    expect(fs.existsSync(bin)).toBe(true);
  });

  const itSymlink = canSymlink() ? it : it.skip;
  itSymlink(
    'follows a pnpm-symlinked package to an absolute script path',
    () => {
      const bin = resolveReactNativeBin(fixtures.pnpmAppRoot);
      expect(path.isAbsolute(bin)).toBe(true);
      expect(fs.realpathSync(bin)).toBe(
        fs.realpathSync(fixtures.pnpmCliRealpath)
      );
    }
  );

  it('prefers the local package over a planted PATH shim', () => {
    // Threat row "Executable-file classification": resolution is a local
    // require.resolve chain — PATH is never consulted, so a global
    // react-native can never shadow the app's own install.
    const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rnbin-shim-'));
    const shim = path.join(shimDir, 'react-native');
    fs.writeFileSync(shim, '#!/bin/sh\necho shim\n');
    fs.chmodSync(shim, 0o755);
    const originalPath = process.env.PATH;
    process.env.PATH = `${shimDir}${path.delimiter}${originalPath ?? ''}`;
    try {
      const bin = resolveReactNativeBin(fixtures.appRoot);
      expect(bin).not.toContain(shimDir);
      expect(bin).toBe(
        path.join(fixtures.appRoot, 'node_modules', 'react-native', 'cli.js')
      );
    } finally {
      process.env.PATH = originalPath;
      fs.rmSync(shimDir, { recursive: true, force: true });
    }
  });

  it('fails with a clean CLIError naming react-native when no local package exists', () => {
    // jest's module registry always resolves a real react-native from the
    // repo tree — even with paths: [appRoot] it falls back on a miss — so
    // the miss leg is exercised through the documented resolution seam
    // with a Node-shaped MODULE_NOT_FOUND. fixtures.noRoot stands in for
    // the real app root that would miss on a normal machine.
    const miss = Object.assign(
      new Error("Cannot find module 'react-native/package.json'"),
      { code: 'MODULE_NOT_FOUND' }
    );
    let caught: unknown;
    try {
      resolveReactNativeBin(fixtures.noRoot, {
        requireResolve: () => {
          throw miss;
        },
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CLIError);
    const message = (caught as Error).message;
    expect(message).toContain('react-native');
    expect(message).toContain(fixtures.noRoot);
    expect(message).not.toMatch(/\n\s+at\s/);
  });
});
