import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Folder name of the Hermes compiler binary for the current OS.
 */
const getHermesOSBin = (): string | null => {
  switch (os.platform()) {
    case 'darwin':
      return 'osx-bin';
    case 'linux':
      return 'linux64-bin';
    case 'win32':
      return 'win64-bin';
    default:
      return null;
  }
};

/**
 * Whether the binary exists. On Windows the file is `hermesc.exe`, which `execa`
 * resolves from the extensionless path, so both spellings count.
 */
const binaryExists = (binaryPath: string): boolean =>
  fs.existsSync(binaryPath) ||
  (os.platform() === 'win32' && fs.existsSync(`${binaryPath}.exe`));

const isDirectory = (dirPath: string): boolean => {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
};

const tryRealpath = (filePath: string): string | undefined => {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return undefined;
  }
};

/**
 * Finds `packageName` the way Node resolves it from `fromDir`: in `node_modules` of
 * `fromDir` and each of its ancestors. Unlike `require.resolve`, `NODE_PATH` and global
 * folders are not consulted: package manager shims (e.g. pnpm's) set `NODE_PATH`, which
 * could yield an unrelated copy, and a mismatched hermesc emits bytecode the app's
 * Hermes runtime can't load.
 */
const resolvePackageDir = (
  packageName: string,
  fromDir: string
): string | undefined => {
  let dir = path.resolve(fromDir);

  while (true) {
    if (path.basename(dir) !== 'node_modules') {
      const packageDir = path.join(dir, 'node_modules', packageName);
      if (fs.existsSync(path.join(packageDir, 'package.json'))) {
        return tryRealpath(packageDir) ?? packageDir;
      }
    }

    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
      return undefined;
    }
    dir = parentDir;
  }
};

/**
 * Locations where `hermesc` may live for a given `react-native` package,
 * beyond the lexical `<reactNativePath>/../hermes-compiler` join:
 * - next to the real (symlink-resolved) `react-native`, e.g. pnpm's `.pnpm/<rn>/node_modules`
 * - wherever `hermes-compiler` resolves from `react-native`, e.g. nested in
 *   `react-native/node_modules` when versions conflict, or hoisted further up.
 */
const getResolvedHermesCompilerDirs = (reactNativePath: string): string[] => {
  const dirs: string[] = [];
  const realReactNativePath = tryRealpath(reactNativePath);

  if (realReactNativePath) {
    dirs.push(path.join(realReactNativePath, '..', 'hermes-compiler'));
  }

  for (const fromDir of new Set([
    realReactNativePath ?? reactNativePath,
    reactNativePath,
  ])) {
    const resolvedDir = resolvePackageDir('hermes-compiler', fromDir);
    if (resolvedDir) {
      dirs.push(resolvedDir);
    }
  }

  return dirs;
};

interface GetHermesCLIPathOptions {
  /**
   * Directory to resolve `react-native` from when `reactNativePath` does not exist,
   * e.g. a workspace whose `react-native` is hoisted to the monorepo root.
   * Used only to locate `hermesc`.
   */
  resolveReactNativeFrom?: string;
}

/**
 * Determines the path to the Hermes compiler binary.
 *
 * Checks, in order:
 * 1. `<reactNativePath>/../hermes-compiler/hermesc/{os-bin}/hermesc` (RN >= 0.82, hoisted)
 * 2. `<reactNativePath>/sdks/hermesc/{os-bin}/hermesc` (RN < 0.82)
 * 3. `hermes-compiler` next to the symlink-resolved `react-native` (e.g. pnpm),
 *    then wherever `hermes-compiler` resolves from `react-native`
 * 4. The same locations for `react-native` resolved from `resolveReactNativeFrom`,
 *    when `reactNativePath` is not a directory.
 *
 * @throws When no Hermes compiler binary is found, listing every path checked.
 */
export const getHermesCLIPath = (
  reactNativePath: string,
  { resolveReactNativeFrom }: GetHermesCLIPathOptions = {}
): string => {
  const osBin = getHermesOSBin();

  if (!osBin) {
    throw new Error(
      '[RepackHermesBytecodePlugin] OS not recognized. ' +
        'Please set hermesCLIPath to the path of a working Hermes compiler.'
    );
  }

  const getBinaryPath = (hermesCompilerDir: string) =>
    path.join(hermesCompilerDir, 'hermesc', osBin, 'hermesc');

  const hermesCompilerPath = getBinaryPath(
    path.join(reactNativePath, '..', 'hermes-compiler')
  );

  // Kept exactly as before so that existing setups resolve to the same binary.
  if (fs.existsSync(hermesCompilerPath)) {
    return hermesCompilerPath;
  }

  // Previous hermesc path in older react native versions, <0.82.
  const legacyHermesCLIPath = path.join(
    reactNativePath,
    'sdks',
    'hermesc',
    osBin,
    'hermesc'
  );

  if (binaryExists(legacyHermesCLIPath)) {
    return legacyHermesCLIPath;
  }

  const candidates = [
    // Only differs from the check above on Windows, where the binary is `hermesc.exe`.
    hermesCompilerPath,
    ...getResolvedHermesCompilerDirs(reactNativePath).map(getBinaryPath),
  ];

  if (resolveReactNativeFrom && !isDirectory(reactNativePath)) {
    const resolvedReactNativePath = resolvePackageDir(
      'react-native',
      resolveReactNativeFrom
    );

    if (resolvedReactNativePath) {
      candidates.push(
        getBinaryPath(
          path.join(resolvedReactNativePath, '..', 'hermes-compiler')
        ),
        path.join(resolvedReactNativePath, 'sdks', 'hermesc', osBin, 'hermesc'),
        ...getResolvedHermesCompilerDirs(resolvedReactNativePath).map(
          getBinaryPath
        )
      );
    }
  }

  const found = candidates.find(binaryExists);
  if (found) {
    return found;
  }

  const checkedPaths = [
    ...new Set([hermesCompilerPath, legacyHermesCLIPath, ...candidates]),
  ];

  throw new Error(
    '[RepackHermesBytecodePlugin] Could not find the Hermes compiler (hermesc). ' +
      `Checked:\n${checkedPaths.map((p) => `  - ${p}`).join('\n')}\n` +
      'Set the `hermesCLIPath` option to the hermesc binary, ' +
      'or `reactNativePath` to the react-native package that ships it.'
  );
};
