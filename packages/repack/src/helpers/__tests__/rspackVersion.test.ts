import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import {
  getRspackMajorVersion,
  getRspackMajorVersionFromCompiler,
  getRspackVersion,
  isRspack2,
} from '../rspackVersion.js';

/**
 * Creates a fake project directory containing `node_modules/@rspack/core`
 * with the given version. The fake package's entrypoint throws, so any
 * codepath that imports `@rspack/core` (instead of only resolving its
 * `package.json`) fails loudly.
 */
function createFixtureProject(root: string, version: string): string {
  const projectDir = fs.mkdtempSync(path.join(root, 'project-'));
  const packageDir = path.join(projectDir, 'node_modules', '@rspack', 'core');
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify({ name: '@rspack/core', version, main: 'index.js' })
  );
  fs.writeFileSync(
    path.join(packageDir, 'index.js'),
    'throw new Error("@rspack/core must not be imported by version detection");'
  );
  return projectDir;
}

describe('rspackVersion helpers', () => {
  let tmpRoot: string;
  let rspack1Project: string;
  let rspack2Project: string;
  let brokenProject: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-rspack-version-'));
    rspack1Project = createFixtureProject(tmpRoot, '1.7.0');
    rspack2Project = createFixtureProject(tmpRoot, '2.3.4');
    // simulates an unusable @rspack/core install: package.json resolves but
    // cannot be loaded, which exercises the same `catch -> null` branch as a
    // missing install (jest's `require.resolve` treats `paths` as additional
    // lookup paths and falls back to the workspace install, so a truly absent
    // package cannot be simulated in-process here)
    brokenProject = createFixtureProject(tmpRoot, '0.0.0');
    fs.writeFileSync(
      path.join(
        brokenProject,
        'node_modules',
        '@rspack',
        'core',
        'package.json'
      ),
      'not-json'
    );
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe('getRspackVersion', () => {
    it('resolves the installed @rspack/core version by default', () => {
      const {
        version: installedVersion,
      } = require('@rspack/core/package.json');
      expect(getRspackVersion()).toBe(installedVersion);
    });

    it('resolves @rspack/core from the given project context', () => {
      expect(getRspackVersion(rspack2Project)).toBe('2.3.4');
      expect(getRspackVersion(rspack1Project)).toBe('1.7.0');
    });

    it('does not import @rspack/core while detecting the version', () => {
      // the fixture package's entrypoint throws on import, so a non-null
      // result proves only package.json was read
      expect(getRspackVersion(rspack2Project)).toBe('2.3.4');
    });

    it('returns null when the version cannot be read', () => {
      expect(getRspackVersion(brokenProject)).toBeNull();
    });
  });

  describe('getRspackMajorVersion', () => {
    it('parses the major version', () => {
      expect(getRspackMajorVersion(rspack1Project)).toBe(1);
      expect(getRspackMajorVersion(rspack2Project)).toBe(2);
    });

    it('returns null when the version cannot be read', () => {
      expect(getRspackMajorVersion(brokenProject)).toBeNull();
    });
  });

  describe('isRspack2', () => {
    it('detects Rspack 2 from the given project context', () => {
      expect(isRspack2(rspack2Project)).toBe(true);
      expect(isRspack2(rspack1Project)).toBe(false);
    });

    it('returns false when the version cannot be read', () => {
      expect(isRspack2(brokenProject)).toBe(false);
    });
  });

  describe('getRspackMajorVersionFromCompiler', () => {
    it('reads the major version from an rspack compiler', () => {
      // minimal mock: only `webpack.rspackVersion` is accessed
      const compiler = {
        webpack: { rspackVersion: '2.1.2' },
      } as unknown as RspackCompiler;
      expect(getRspackMajorVersionFromCompiler(compiler)).toBe(2);

      const rspack1Compiler = {
        webpack: { rspackVersion: '1.7.12' },
      } as unknown as RspackCompiler;
      expect(getRspackMajorVersionFromCompiler(rspack1Compiler)).toBe(1);
    });

    it('returns null for a webpack compiler', () => {
      // minimal mock: webpack compilers expose `version`, not `rspackVersion`
      const compiler = {
        webpack: { version: '5.99.0' },
      } as unknown as WebpackCompiler;
      expect(getRspackMajorVersionFromCompiler(compiler)).toBeNull();
    });
  });
});
