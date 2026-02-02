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
 * Determines the path to the Hermes compiler binary.
 *
 * Defaults to './node_modules/hermes-compiler/hermesc/{os-bin}/hermesc'
 */
export const getHermesCLIPath = (reactNativePath: string): string => {
  const osBin = getHermesOSBin();

  if (!osBin) {
    throw new Error(
      '[RepackHermesBytecodePlugin] OS not recognized. ' +
        'Please set hermesCLIPath to the path of a working Hermes compiler.'
    );
  }

  const hermesCompilerPath = path.join(
    reactNativePath,
    '..',
    'hermes-compiler',
    'hermesc',
    osBin,
    'hermesc'
  );

  if (fs.existsSync(hermesCompilerPath)) {
    return hermesCompilerPath;
  }

  // Fallback to the previous hermesc path in older react native versions, <0.82.
  return path.join(reactNativePath, 'sdks', 'hermesc', osBin, 'hermesc');
};
