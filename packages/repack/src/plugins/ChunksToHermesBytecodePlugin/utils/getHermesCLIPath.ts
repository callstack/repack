import path from 'node:path';
import os from 'node:os';

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
 * Defaults to './node_modules/react-native/sdks/hermesc/{os-bin}/hermesc'
 */
export const getHermesCLIPath = (reactNativePath: string): string => {
  const osBin = getHermesOSBin();

  if (!osBin) {
    throw new Error(
      'ChunksToHermesBytecodePlugin: OS not recognized. Please set hermesCLIPath to the path of a working Hermes compiler.'
    );
  }

  return path.join(reactNativePath, 'sdks', 'hermesc', osBin, 'hermesc');
};
