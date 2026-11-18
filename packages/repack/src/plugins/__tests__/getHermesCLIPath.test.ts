import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getHermesCLIPath } from '../HermesBytecodePlugin/utils/getHermesCLIPath.js';

function createFile(filePath: string, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function createPackage(packagePath: string, name: string) {
  createFile(
    path.join(packagePath, 'package.json'),
    JSON.stringify({ name, version: '0.0.0' })
  );
}

/** Creates `hermes-compiler` with its binary and returns the binary path. */
function createHermesCompiler(packagePath: string, binary = 'hermesc') {
  createPackage(packagePath, 'hermes-compiler');
  const binaryPath = path.join(packagePath, 'hermesc', 'osx-bin', binary);
  createFile(binaryPath);
  return binaryPath;
}

function symlinkDir(target: string, linkPath: string) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  // junctions don't need elevated permissions on Windows; ignored elsewhere
  fs.symlinkSync(target, linkPath, 'junction');
}

describe('getHermesCLIPath', () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'repack-hermesc-'))
    );
    jest.spyOn(os, 'platform').mockReturnValue('darwin');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('returns hermes-compiler next to react-native (hoisted layout)', () => {
    const reactNativePath = path.join(root, 'node_modules', 'react-native');
    createPackage(reactNativePath, 'react-native');
    createHermesCompiler(path.join(root, 'node_modules', 'hermes-compiler'));
    // a legacy binary must not take precedence
    createFile(path.join(reactNativePath, 'sdks/hermesc/osx-bin/hermesc'));

    expect(getHermesCLIPath(reactNativePath)).toBe(
      path.join(
        reactNativePath,
        '..',
        'hermes-compiler/hermesc/osx-bin/hermesc'
      )
    );
  });

  it('returns legacy sdks/hermesc path for react-native < 0.82', () => {
    const reactNativePath = path.join(root, 'node_modules', 'react-native');
    createPackage(reactNativePath, 'react-native');
    const legacyPath = path.join(
      reactNativePath,
      'sdks/hermesc/osx-bin/hermesc'
    );
    createFile(legacyPath);
    // resolvable from react-native, but the legacy path is checked first
    createHermesCompiler(
      path.join(reactNativePath, 'node_modules', 'hermes-compiler')
    );

    expect(getHermesCLIPath(reactNativePath)).toBe(legacyPath);
  });

  it('follows a symlinked react-native to hermes-compiler (pnpm layout)', () => {
    const storePath = path.join(
      root,
      'node_modules/.pnpm/react-native@0.88.1/node_modules'
    );
    const realReactNativePath = path.join(storePath, 'react-native');
    createPackage(realReactNativePath, 'react-native');
    const binaryPath = createHermesCompiler(
      path.join(storePath, 'hermes-compiler')
    );

    const reactNativePath = path.join(
      root,
      'packages/app/node_modules/react-native'
    );
    symlinkDir(realReactNativePath, reactNativePath);

    expect(getHermesCLIPath(reactNativePath)).toBe(binaryPath);
  });

  it('resolves hermes-compiler from react-native (nested layout)', () => {
    const reactNativePath = path.join(root, 'node_modules', 'react-native');
    createPackage(reactNativePath, 'react-native');
    const binaryPath = createHermesCompiler(
      path.join(reactNativePath, 'node_modules', 'hermes-compiler')
    );

    expect(getHermesCLIPath(reactNativePath)).toBe(binaryPath);
  });

  it('resolves react-native from resolveReactNativeFrom when reactNativePath does not exist', () => {
    const appPath = path.join(root, 'packages', 'app');
    fs.mkdirSync(appPath, { recursive: true });
    const hoistedReactNativePath = path.join(
      root,
      'node_modules',
      'react-native'
    );
    createPackage(hoistedReactNativePath, 'react-native');
    // nested, so it's only reachable through the hoisted react-native
    const binaryPath = createHermesCompiler(
      path.join(hoistedReactNativePath, 'node_modules', 'hermes-compiler')
    );
    const reactNativePath = path.join(appPath, 'node_modules', 'react-native');

    expect(() => getHermesCLIPath(reactNativePath)).toThrow(
      'Could not find the Hermes compiler'
    );
    expect(
      getHermesCLIPath(reactNativePath, { resolveReactNativeFrom: appPath })
    ).toBe(binaryPath);
  });

  it('does not use resolveReactNativeFrom when reactNativePath exists', () => {
    const appPath = path.join(root, 'packages', 'app');
    const reactNativePath = path.join(appPath, 'node_modules', 'react-native');
    createPackage(reactNativePath, 'react-native');
    const hoistedReactNativePath = path.join(
      root,
      'node_modules',
      'react-native'
    );
    createPackage(hoistedReactNativePath, 'react-native');
    createHermesCompiler(
      path.join(hoistedReactNativePath, 'node_modules', 'hermes-compiler')
    );

    expect(() =>
      getHermesCLIPath(reactNativePath, { resolveReactNativeFrom: appPath })
    ).toThrow('Could not find the Hermes compiler');
  });

  it('throws an error listing every checked path when hermesc is not found', () => {
    const reactNativePath = path.join(root, 'node_modules', 'react-native');
    createPackage(reactNativePath, 'react-native');

    let error: Error | undefined;
    try {
      getHermesCLIPath(reactNativePath);
    } catch (e) {
      error = e as Error;
    }

    expect(error?.message).toContain(
      path.join(root, 'node_modules/hermes-compiler/hermesc/osx-bin/hermesc')
    );
    expect(error?.message).toContain(
      path.join(reactNativePath, 'sdks/hermesc/osx-bin/hermesc')
    );
    expect(error?.message).toContain('hermesCLIPath');
  });

  it('throws when the OS is not recognized', () => {
    jest.spyOn(os, 'platform').mockReturnValue('aix');

    expect(() => getHermesCLIPath(root)).toThrow('OS not recognized');
  });

  describe('on Windows', () => {
    beforeEach(() => {
      jest.spyOn(os, 'platform').mockReturnValue('win32');
    });

    it('returns legacy path without the .exe suffix', () => {
      const reactNativePath = path.join(root, 'node_modules', 'react-native');
      const legacyPath = path.join(
        reactNativePath,
        'sdks/hermesc/win64-bin/hermesc'
      );
      createFile(`${legacyPath}.exe`);

      expect(getHermesCLIPath(reactNativePath)).toBe(legacyPath);
    });

    it('finds hermesc.exe in hermes-compiler', () => {
      const reactNativePath = path.join(root, 'node_modules', 'react-native');
      createPackage(reactNativePath, 'react-native');
      const binaryPath = path.join(
        root,
        'node_modules/hermes-compiler/hermesc/win64-bin/hermesc'
      );
      createFile(`${binaryPath}.exe`);

      expect(getHermesCLIPath(reactNativePath)).toBe(binaryPath);
    });
  });
});
